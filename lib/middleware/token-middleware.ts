import { NextRequest, NextResponse } from 'next/server';
import { tokenService } from '@/lib/services/token.service';
import { requireAuth } from '@/lib/server/auth';

export interface TokenMiddlewareOptions {
  featureName: string;
  context?: Record<string, any>;
  skipDeduction?: boolean; // For checking limits without deducting
  requiredTokens?: number; // Override calculated tokens
}

// Centralized authentication helper using server-side requireAuth
async function getAuthenticatedUser(request: NextRequest) {
  const result = await requireAuth(request)
  if ('error' in result) return { user: null, error: new Error('Unauthorized') }
  return { user: result.user, error: null }
}

export class TokenMiddleware {
  /**
   * Middleware to check and deduct tokens before API execution
   */
  static async withTokens(
    request: NextRequest,
    options: TokenMiddlewareOptions,
    handler: (userId: string) => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      // Get authenticated user
      const { user, error: authError } = await getAuthenticatedUser(request);
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const userId = user.id;
      const { featureName, context = {}, skipDeduction = false, requiredTokens } = options;

      // Explorer-specific bypass: Assistant on Explorer tab is unlimited (user-provided keys)
      const isExplorerAssistant =
        featureName === 'ai_chat' &&
        (context as any)?.origin === 'explorer' &&
        ((context as any)?.feature === 'assistant');

      if (isExplorerAssistant) {
        // Skip all rate/token checks and execute handler directly
        const response = await handler(userId);
        // annotate headers to make it explicit no tokens were used
        response.headers.set('X-Tokens-Used', '0');
        response.headers.set('X-Explorer-Bypass', 'assistant');
        return response;
      }

      // Get client IP and user agent for tracking
      const clientIP = request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') || 
        request.headers.get('cf-connecting-ip') ||
        '127.0.0.1';
      const userAgent = request.headers.get('user-agent') || 'Unknown';

      // Calculate required tokens
      const tokensNeeded = requiredTokens || await tokenService.getFeatureCost(featureName, context);

      // Check rate limits
      const rateLimit = await tokenService.checkRateLimit(userId, featureName, context);
      
      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: rateLimit.errorMessage || 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            details: {
              tokensNeeded: rateLimit.tokensNeeded,
              monthlyRemaining: rateLimit.monthlyRemaining,
              resetTime: rateLimit.resetTime
            }
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.max(1, Math.ceil((rateLimit.resetTime - Date.now()) / 1000)).toString(),
              'X-RateLimit-Remaining-Monthly': rateLimit.monthlyRemaining.toString(),
              'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString()
            }
          }
        );
      }

      // Deduct tokens if not skipping
      let transactionId: string | undefined;
      if (!skipDeduction) {
        const deductResult = await tokenService.deductTokens(
          userId,
          featureName,
          tokensNeeded,
          context,
          clientIP,
          userAgent
        );

        if (!deductResult.success) {
          return NextResponse.json(
            {
              error: deductResult.error || 'Failed to deduct tokens',
              code: 'TOKEN_DEDUCTION_FAILED'
            },
            { status: 402 } // Payment Required
          );
        }

        transactionId = deductResult.transactionId;
      }

      try {
        // Execute the handler
        const response = await handler(userId);
        
        // Add token usage headers to response
        response.headers.set('X-Tokens-Used', tokensNeeded.toString());
        response.headers.set('X-Tokens-Remaining-Monthly', rateLimit.monthlyRemaining.toString());
        
        if (transactionId) {
          response.headers.set('X-Token-Transaction-ID', transactionId);
        }

        return response;

      } catch (handlerError) {
        // If handler fails and we deducted tokens, refund them
        if (transactionId && !skipDeduction) {
          await tokenService.refundTokens(
            userId,
            featureName,
            tokensNeeded,
            { ...context, refund_reason: 'handler_error', original_transaction: transactionId }
          );
        }
        
        console.error('Handler error:', handlerError);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }

    } catch (error) {
      console.error('Token middleware error:', error);
      return NextResponse.json(
        { error: 'Token validation failed' },
        { status: 500 }
      );
    }
  }

  /**
   * Helper to check tokens without deducting (for preflight checks)
   */
  static async checkTokensOnly(
    request: NextRequest,
    featureName: string,
    context: Record<string, any> = {}
  ): Promise<NextResponse | null> {
    try {
      const { user, error: authError } = await getAuthenticatedUser(request);
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const rateLimit = await tokenService.checkRateLimit(user.id, featureName, context);
      
      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: rateLimit.errorMessage || 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            details: {
              tokensNeeded: rateLimit.tokensNeeded,
              monthlyRemaining: rateLimit.monthlyRemaining,
              resetTime: rateLimit.resetTime
            }
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil(rateLimit.resetTime / 1000).toString(),
              'X-RateLimit-Remaining-Monthly': rateLimit.monthlyRemaining.toString(),
              'X-RateLimit-Reset': new Date(Date.now() + rateLimit.resetTime).toISOString()
            }
          }
        );
      }

      return null; // No error, proceed
    } catch (error) {
      console.error('Token check error:', error);
      return NextResponse.json(
        { error: 'Token validation failed' },
        { status: 500 }
      );
    }
  }

  /**
   * Parse request context for dynamic token calculation
   */
  static parseRequestContext(request: NextRequest): Record<string, any> {
    const context: Record<string, any> = {};
    
    // Extract common context from request
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Common parameters that affect token costs
    if (searchParams.has('deep_search')) {
      context.deep_search = searchParams.get('deep_search') === 'true';
    }
    
    if (searchParams.has('limit')) {
      const limit = parseInt(searchParams.get('limit') || '10');
      context.per_result = Math.min(limit, 50); // Cap at 50 results
    }
    
    if (searchParams.has('quality')) {
      const quality = (searchParams.get('quality') || '').toLowerCase();
      // Pass-through raw quality and map common aliases to high_quality flag
      context.quality = quality;
      if (quality === 'high' || quality === 'deep-review' || quality === 'enhanced') {
        context.high_quality = true;
      }
    }

    // Pass through optional flags for selective bypass
    const origin = searchParams.get('origin');
    const feature = searchParams.get('feature');
    if (origin) context.origin = origin;
    if (feature) context.feature = feature;

    return context;
  }
}

// Helper function for easier usage in API routes
export function withTokenValidation(
  featureName: string,
  handler: (userId: string, request: NextRequest) => Promise<NextResponse>,
  options: Omit<TokenMiddlewareOptions, 'featureName'> = {}
) {
  return async (request: NextRequest) => {
    const context = {
      ...TokenMiddleware.parseRequestContext(request),
      ...options.context
    };

    return TokenMiddleware.withTokens(
      request,
      { featureName, ...options, context },
      (userId) => handler(userId, request)
    );
  };
}
