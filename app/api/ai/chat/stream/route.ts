import { NextRequest, NextResponse } from 'next/server';
import { enhancedAIService } from '@/lib/enhanced-ai-service';
import { type AIProvider } from '@/lib/ai-providers';
import { withTokenValidation } from '@/lib/middleware/token-middleware';

// Ensure Node.js runtime for service-role usage and stable SSE behavior
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const aiService = enhancedAIService;

// Use token-based middleware for GET
export const GET = withTokenValidation(
  'ai_chat',
  async (userId: string, request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    
    try {
      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const message = searchParams.get('message')?.trim() || '';
      const messagesParam = searchParams.get('messages');
      const provider = searchParams.get('provider') as AIProvider;
      const model = searchParams.get('model') || '';
      const systemPrompt = searchParams.get('systemPrompt') || '';
      const temperature = parseFloat(searchParams.get('temperature') || '0.7');
      const maxTokens = parseInt(searchParams.get('maxTokens') || '2000');
    
      // Handle conversation history or single message
      let conversationHistory: Array<{ role: string; content: string }> = [];
      
      if (messagesParam) {
        try {
          conversationHistory = JSON.parse(messagesParam);
          if (!Array.isArray(conversationHistory)) {
            return new NextResponse('Invalid messages format', { status: 400 });
          }
        } catch (error) {
          return new NextResponse('Invalid messages JSON', { status: 400 });
        }
      } else if (message) {
        // Single message mode for backward compatibility
        conversationHistory = [{ role: 'user', content: message }];
      } else {
        return new NextResponse('Message or messages required', { status: 400 });
      }
      
      // Validate conversation length
      const totalLength = conversationHistory.reduce((sum, msg) => sum + msg.content.length, 0);
      if (totalLength > 50000) {
        return new NextResponse('Conversation too long (max 50,000 characters total)', { status: 400 });
      }

    const encoder = new TextEncoder();
    let controller: ReadableStreamDefaultController<Uint8Array>;
    let closed = false;
    let totalTokens = 0;

    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
        
        // Initial event with metadata
        const initPayload = {
          type: 'init',
          provider: provider || 'auto',
          model: model || 'auto',
          timestamp: new Date().toISOString(),
        };
        
        controller.enqueue(encoder.encode(`event: init\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initPayload)}\n\n`));

        // Heartbeat to keep connection alive
        const interval = setInterval(() => {
          if (closed) return;
          controller.enqueue(encoder.encode(`event: ping\n`));
          controller.enqueue(encoder.encode(`data: {}\n\n`));
        }, 15000);

        // Handle client abort
        const abort = () => {
          if (closed) return;
          closed = true;
          clearInterval(interval);
          try { controller.close(); } catch {}
        };
        request.signal.addEventListener('abort', abort);

        // Start streaming AI generation
        const run = async () => {
          try {
            // Build the conversation context with full history
            let fullPrompt = '';
            
            if (systemPrompt) {
              fullPrompt += `${systemPrompt}\n\n`;
            }
            
            // Build conversation context from history
            if (conversationHistory.length > 0) {
              fullPrompt += 'Conversation History:\n';
              
              // Include all messages in context for better continuity
              conversationHistory.forEach((msg, index) => {
                const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
                fullPrompt += `${roleLabel}: ${msg.content}\n`;
              });
              
              // Add continuation prompt for the assistant
              fullPrompt += '\nAssistant: ';
            } else {
              // Fallback for empty conversation
              fullPrompt += 'User: Hello\nAssistant: ';
            }

            // Stream the AI response with fallback handling
            try {
              await aiService.generateTextStream({
                prompt: fullPrompt,
                provider: provider,
                model: model,
                temperature: temperature,
                maxTokens: maxTokens,
                userId: userId,
                onToken: (token: string) => {
                  if (closed) return;
                  totalTokens++;
                  
                  const tokenPayload = {
                    content: token,
                    timestamp: new Date().toISOString(),
                  };
                  
                  controller.enqueue(encoder.encode(`event: token\n`));
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(tokenPayload)}\n\n`));
                },
                onProgress: (progress: { message?: string; percentage?: number }) => {
                  if (closed) return;
                  
                  // Generate meaningful reasoning content instead of generic progress
                  const reasoningMessages = [
                    "Analyzing the user's request and identifying key components...",
                    "Breaking down the problem into manageable parts...",
                    "Considering relevant context and background information...",
                    "Evaluating different approaches and methodologies...",
                    "Synthesizing information from multiple sources...",
                    "Structuring the response for maximum clarity and usefulness...",
                    "Reviewing and refining the analysis...",
                    "Preparing comprehensive answer with supporting details..."
                  ];
                  
                  const reasoningIndex = Math.floor((progress.percentage || 0) / 12.5);
                  const reasoningMessage = reasoningMessages[Math.min(reasoningIndex, reasoningMessages.length - 1)];
                  
                  const progressPayload = {
                    message: reasoningMessage,
                    percentage: progress.percentage,
                    timestamp: new Date().toISOString(),
                  };
                  
                  controller.enqueue(encoder.encode(`event: progress\n`));
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressPayload)}\n\n`));
                },
                onError: (error: string) => {
                  if (closed) return;
                  
                  console.error('Streaming error:', error);
                  
                  // Check if this is a model compatibility error that should trigger fallback
                  const isCompatibilityError = error.includes('400') || 
                                             error.includes('Bad Request') || 
                                             error.includes('model') || 
                                             error.includes('unsupported') ||
                                             error.includes('not found') ||
                                             error.includes('invalid');
                  
                  if (isCompatibilityError) {
                    // Send progress message about trying fallback
                    const fallbackProgressPayload = {
                      message: `Model incompatible, trying alternative provider...`,
                      percentage: 25,
                      timestamp: new Date().toISOString(),
                    };
                    
                    controller.enqueue(encoder.encode(`event: progress\n`));
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(fallbackProgressPayload)}\n\n`));
                    
                    // Attempt fallback with different provider
                    attemptFallback();
                    return;
                  }
                  
                  const errorPayload = {
                    error,
                    timestamp: new Date().toISOString(),
                  };
                  
                  controller.enqueue(encoder.encode(`event: error\n`));
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorPayload)}\n\n`));
                  
                  try { controller.close(); } catch {}
                  closed = true;
                },
              });
            } catch (streamError) {
              if (closed) return;
              
              console.error('Stream generation failed, attempting fallback:', streamError);
              
              // Send progress about fallback attempt
              const fallbackProgressPayload = {
                message: 'Primary model failed, trying alternative...',
                percentage: 30,
                timestamp: new Date().toISOString(),
              };
              
              controller.enqueue(encoder.encode(`event: progress\n`));
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(fallbackProgressPayload)}\n\n`));
              
              // Attempt fallback
              await attemptFallback();
            }
            
            // Fallback function to try alternative providers/models
            async function attemptFallback() {
              try {
                // Try streaming with no specific provider (let service choose fallback)
                await aiService.generateTextStream({
                  prompt: fullPrompt,
                  temperature: temperature,
                  maxTokens: maxTokens,
                  userId: userId,
                  // Don't specify provider to trigger automatic fallback
                  onToken: (token: string) => {
                    if (closed) return;
                    totalTokens++;
                    
                    const tokenPayload = {
                      content: token,
                      timestamp: new Date().toISOString(),
                    };
                    
                    controller.enqueue(encoder.encode(`event: token\n`));
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(tokenPayload)}\n\n`));
                  },
                  onProgress: (progress: { message?: string; percentage?: number }) => {
                    if (closed) return;
                    
                    const progressPayload = {
                      ...progress,
                      timestamp: new Date().toISOString(),
                    };
                    
                    controller.enqueue(encoder.encode(`event: progress\n`));
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressPayload)}\n\n`));
                  },
                  onError: (error: string) => {
                    if (closed) return;
                    
                    console.error('Fallback streaming error:', error);
                    
                    const errorPayload = {
                      error: `All providers failed: ${error}`,
                      timestamp: new Date().toISOString(),
                    };
                    
                    controller.enqueue(encoder.encode(`event: error\n`));
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorPayload)}\n\n`));
                    
                    try { controller.close(); } catch {}
                    closed = true;
                  },
                });
              } catch (fallbackError) {
                if (closed) return;
                
                console.error('All fallback attempts failed:', fallbackError);
                
                const errorPayload = {
                  error: `All AI providers failed. Please try again later.`,
                  timestamp: new Date().toISOString(),
                };
                
                controller.enqueue(encoder.encode(`event: error\n`));
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorPayload)}\n\n`));
                
                try { controller.close(); } catch {}
                closed = true;
              }
            } 
          } catch (error) {
            if (closed) return;
            
            const errorPayload = {
              error: error instanceof Error ? error.message : 'Unknown error occurred',
              timestamp: new Date().toISOString(),
            };
            
            controller.enqueue(encoder.encode(`event: error\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorPayload)}\n\n`));
            
            try { controller.close(); } catch {}
            closed = true;
          }
        };

        run()
          .then(() => {
            if (closed) return;
            
            const donePayload = {
              type: 'done',
              totalTokens,
              processingTime: Date.now() - startTime,
              timestamp: new Date().toISOString(),
            };
            
            controller.enqueue(encoder.encode(`event: done\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(donePayload)}\n\n`));
            
            try { controller.close(); } catch {}
            closed = true;
          })
          .catch((err) => {
            if (closed) return;
            
            const errorPayload = {
              type: 'error',
              error: err instanceof Error ? err.message : 'Stream processing failed',
              timestamp: new Date().toISOString(),
            };
            
            controller.enqueue(encoder.encode(`event: error\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorPayload)}\n\n`));
            
            try { controller.close(); } catch {}
            closed = true;
          });
      },
      cancel() {
        closed = true;
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('AI Chat Stream API Error:', error);
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return new NextResponse('Authentication required', { status: 401 });
    }
    
    return new NextResponse('Internal server error', { status: 500 });
  }
}
);