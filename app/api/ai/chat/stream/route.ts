import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { enhancedAIService } from '@/lib/enhanced-ai-service';
import { createClient } from '@supabase/supabase-js';
import { type AIProvider } from '@/lib/ai-providers';

// Ensure Node.js runtime for service-role usage and stable SSE behavior
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Supabase client (service role for server-side ops like rate limiting)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const aiService = enhancedAIService;

interface RateLimitResult {
  allowed: boolean;
  current_count: number;
  reset_time: string;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Authenticate user - supports header, query param, or cookie auth for SSE
    const user = await requireAuth(request, "ai-chat-stream");
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const message = searchParams.get('message')?.trim() || '';
    const provider = searchParams.get('provider') as AIProvider;
    const model = searchParams.get('model') || '';
    const systemPrompt = searchParams.get('systemPrompt') || '';
    const temperature = parseFloat(searchParams.get('temperature') || '0.7');
    const maxTokens = parseInt(searchParams.get('maxTokens') || '2000');
    
    // Validate required fields
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response('Message is required', { status: 400 });
    }
    
    if (message.trim().length > 10000) {
      return new Response('Message too long (max 10,000 characters)', { status: 400 });
    }

    // Check rate limit
    const clientIP = getClientIP(request);
    const rateLimit = await checkRateLimit(user.id, clientIP);
    if (!rateLimit.allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((new Date(rateLimit.reset_time).getTime() - Date.now()) / 1000));
      return new Response('Rate limit exceeded. Try later.', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '50',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(rateLimit.reset_time).getTime().toString(),
          'Retry-After': retryAfterSec.toString(),
        },
      });
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
          rateLimit: {
            limit: 50,
            remaining: Math.max(0, 50 - rateLimit.current_count),
            resetTime: rateLimit.reset_time,
          },
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
            // Build the prompt with system context if provided
            const fullPrompt = systemPrompt 
              ? `${systemPrompt}\n\nUser: ${message.trim()}\nAssistant:`
              : message.trim();

            // Stream the AI response with fallback handling
            try {
              await aiService.generateTextStream({
                prompt: fullPrompt,
                provider: provider,
                model: model,
                temperature: temperature,
                maxTokens: maxTokens,
                userId: user.id,
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
                  userId: user.id,
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

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-RateLimit-Limit': '50',
        'X-RateLimit-Remaining': Math.max(0, 50 - rateLimit.current_count).toString(),
        'X-RateLimit-Reset': new Date(rateLimit.reset_time).getTime().toString(),
      },
    });

  } catch (error) {
    console.error('AI Chat Stream API Error:', error);
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return new Response('Authentication required', { status: 401 });
    }
    
    return new Response('Internal server error', { status: 500 });
  }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;
  if (cfConnectingIP) return cfConnectingIP;
  return '127.0.0.1';
}

async function checkRateLimit(userId: string, ipAddress: string): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabase.rpc('check_literature_search_rate_limit', {
      p_user_id: userId,
      p_ip_address: ipAddress,
      p_limit: 50, // Lower limit for AI chat streaming
      p_window_minutes: 60,
    });
    if (error) throw error;
    return data?.[0] || {
      allowed: true,
      current_count: 0,
      reset_time: new Date(Date.now() + 3600000).toISOString(),
    };
  } catch (e) {
    // Soft-fail: allow request
    return {
      allowed: true,
      current_count: 0,
      reset_time: new Date(Date.now() + 3600000).toISOString(),
    };
  }
}
