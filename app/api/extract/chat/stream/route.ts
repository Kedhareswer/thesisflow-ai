/**
 * Extract Data v2 - Chat streaming API
 * Phase 3: Document-grounded chat with conversation history
 * Based on existing chat patterns and memory about context preservation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { OpenRouterClient } from '@/lib/services/openrouter.service';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { ChatMessage } from '@/lib/types/extract-stream';

const openRouterClient = new OpenRouterClient();

export async function POST(request: NextRequest) {
  let encoder: TextEncoder;
  let controller: ReadableStreamDefaultController;
  let heartbeatInterval: NodeJS.Timeout;
  let abortController: AbortController;

  try {
    // Require authentication
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    // Parse request body
    const body = await request.json();
    const { 
      messages, 
      sessionId, 
      fileId, 
      extractionId,
      provider = 'auto',
      model = 'auto',
      temperature = 0.7,
      maxTokens = 2000
    } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    // Validate conversation length (per memory about 50k char limit)
    const conversationText = messages.map(m => m.content).join('\n');
    if (conversationText.length > 50000) {
      return NextResponse.json({ 
        error: 'Conversation too long. Maximum 50,000 characters.' 
      }, { status: 413 });
    }

    // Get document context if available
    let documentContext = '';
    let extractionData: any = null;
    
    if (extractionId || sessionId) {
      try {
        const admin = getSupabaseAdmin();
        
        if (extractionId) {
          // Get specific extraction
          const { data } = await admin
            .from('extractions' as any)
            .select('*')
            .eq('id', extractionId)
            .eq('user_id', user.id)
            .single();
          
          if (data) {
            extractionData = data;
            documentContext = buildDocumentContext(data);
          }
        } else if (sessionId) {
          // Get latest extraction from session
          const { data } = await admin
            .from('extractions' as any)
            .select('*')
            .eq('user_id', user.id)
            .like('result_json->sessionId', `%${sessionId}%`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (data) {
            extractionData = data;
            documentContext = buildDocumentContext(data);
          }
        }
      } catch (error) {
        console.warn('Failed to load document context (non-fatal):', error);
      }
    }

    // Set up SSE stream
    encoder = new TextEncoder();
    abortController = new AbortController();

    const stream = new ReadableStream({
      start(ctrl) {
        controller = ctrl;
        
        // Send initial event
        sendEvent('init', {
          model: model === 'auto' ? 'auto-selected' : model,
          provider: provider === 'auto' ? 'openrouter' : provider,
          hasContext: !!documentContext,
          contextLength: documentContext.length
        });
        
        // Start heartbeat
        heartbeatInterval = setInterval(() => {
          if (!abortController.signal.aborted) {
            sendEvent('ping', {});
          }
        }, 15000);
        
        // Process chat
        processChat(messages, documentContext, provider, model, temperature, maxTokens);
      },
      
      cancel() {
        cleanup();
      }
    });

    // Helper function to send SSE events
    function sendEvent(type: string, data: any) {
      if (controller && !abortController.signal.aborted) {
        const eventData = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(eventData));
      }
    }

    // Build document context from extraction data
    function buildDocumentContext(extraction: any): string {
      const parts: string[] = [];
      
      // Add basic metadata
      parts.push(`Document: ${extraction.file_name}`);
      parts.push(`File Type: ${extraction.file_type}`);
      parts.push(`File Size: ${Math.round(extraction.file_size / 1024)} KB`);
      
      // Add summary if available
      if (extraction.summary) {
        parts.push(`\nSummary: ${extraction.summary}`);
      }
      
      // Add structured data if available
      if (extraction.result_json?.result) {
        const result = extraction.result_json.result;
        
        // Add key points
        if (result.keyPoints && Array.isArray(result.keyPoints)) {
          parts.push(`\nKey Points:\n${result.keyPoints.map((p: string) => `- ${p}`).join('\n')}`);
        }
        
        // Add table information
        if (result.tables && Array.isArray(result.tables) && result.tables.length > 0) {
          parts.push(`\nTables Found: ${result.tables.length}`);
          result.tables.slice(0, 2).forEach((table: any, index: number) => {
            if (table.headers && table.rows) {
              parts.push(`\nTable ${index + 1}:`);
              parts.push(`Headers: ${table.headers.join(', ')}`);
              if (table.rows.length > 0) {
                parts.push(`Sample Row: ${table.rows[0].join(', ')}`);
              }
            }
          });
        }
        
        // Add entity information
        if (result.entities && Array.isArray(result.entities) && result.entities.length > 0) {
          const entityGroups = result.entities.reduce((acc: any, entity: any) => {
            if (!acc[entity.type]) acc[entity.type] = [];
            acc[entity.type].push(entity.value);
            return acc;
          }, {});
          
          parts.push(`\nEntities Found:`);
          Object.entries(entityGroups).forEach(([type, values]: [string, any]) => {
            parts.push(`${type}: ${values.slice(0, 5).join(', ')}${values.length > 5 ? '...' : ''}`);
          });
        }
        
        // Add text excerpt if available
        if (result.text && typeof result.text === 'string') {
          const excerpt = result.text.slice(0, 1000);
          parts.push(`\nDocument Excerpt:\n${excerpt}${result.text.length > 1000 ? '...' : ''}`);
        }
      }
      
      return parts.join('\n');
    }

    // Process chat with OpenRouter
    async function processChat(
      messages: ChatMessage[], 
      context: string, 
      provider: string, 
      model: string, 
      temperature: number, 
      maxTokens: number
    ) {
      try {
        // Build conversation with context (per memory about conversation history)
        const systemMessage: ChatMessage = {
          role: 'system',
          content: [
            'You are a helpful research assistant that analyzes documents and answers questions based on the provided context.',
            'Always ground your responses in the document content when available.',
            'If asked about information not in the document, clearly state that.',
            'Provide specific citations or references when possible.',
            context ? `\n--- DOCUMENT CONTEXT ---\n${context}\n--- END CONTEXT ---` : '',
            '\nRespond helpfully and accurately based on the conversation history and document context.'
          ].filter(Boolean).join('\n')
        };

        const conversationMessages = [systemMessage, ...messages];

        // Model selection with fallbacks (per existing pattern)
        const modelsToTry = model === 'auto' ? [
          'z-ai/glm-4.5-air:free',
          'agentica-org/deepcoder-14b-preview:free', 
          'nousresearch/deephermes-3-llama-3-8b-preview:free',
          'nvidia/nemotron-nano-9b-v2:free',
          'deepseek/deepseek-chat-v3.1:free',
          'openai/gpt-oss-120b:free'
        ] : [model];

        let lastError: any;
        let totalTokens = 0;

        for (const modelToUse of modelsToTry) {
          try {
            sendEvent('progress', { message: `Trying model: ${modelToUse}` });

            // Get response from OpenRouter (non-streaming for now)
            const response = await openRouterClient.chatCompletion(
              modelToUse,
              conversationMessages,
              abortController.signal
            );

            // Simulate streaming by chunking the response
            const chunks = response.match(/.{1,10}/g) || [response];
            totalTokens = Math.ceil(response.length / 4); // Rough token estimate

            for (const chunk of chunks) {
              if (abortController.signal.aborted) break;
              
              sendEvent('token', { token: chunk });
              
              // Add small delay to simulate streaming
              await new Promise(resolve => setTimeout(resolve, 50));
            }

            // Success - send completion event
            sendEvent('done', { 
              usage: { tokens: totalTokens },
              model: modelToUse,
              provider: 'openrouter'
            });
            
            // Save chat message to database (best effort)
            try {
              if (extractionData?.id) {
                const admin = getSupabaseAdmin();
                await admin
                  .from('extraction_chats' as any)
                  .insert({
                    extraction_id: extractionData.id,
                    user_id: user.id,
                    message: messages[messages.length - 1]?.content || '',
                    response: '', // We don't store the full response in streaming
                    model_used: modelToUse,
                    tokens_used: totalTokens
                  });
              }
            } catch (dbError) {
              console.warn('Failed to save chat (non-fatal):', dbError);
            }

            return; // Success, exit function

          } catch (error) {
            lastError = error;
            console.warn(`Model ${modelToUse} failed:`, error);
            continue; // Try next model
          }
        }

        // All models failed
        throw new Error(lastError?.message || 'All chat models failed');

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Chat processing failed';
        sendEvent('error', { message: errorMessage });
      } finally {
        cleanup();
      }
    }

    // Cleanup function
    function cleanup() {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (controller) {
        try {
          controller.close();
        } catch (e) {
          // Controller already closed
        }
      }
    }

    // Handle client disconnect
    request.signal.addEventListener('abort', () => {
      abortController.abort();
      cleanup();
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Chat stream error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Chat stream setup failed' 
      }, 
      { status: 500 }
    );
  }
}
