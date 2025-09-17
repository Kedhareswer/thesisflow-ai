import { NextRequest, NextResponse } from 'next/server';
import { tokenService } from '@/lib/services/token.service';

// Get feature costs (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const featureName = searchParams.get('feature');
    
    if (featureName) {
      // Get cost for specific feature
      const context: Record<string, any> = {};
      // Parse context from query parameters
      searchParams.forEach((value, key) => {
        if (key !== 'feature') {
          context[key] = isNaN(Number(value)) ? value : Number(value);
        }
      });
      
      const cost = await tokenService.getFeatureCost(featureName, context);
      return NextResponse.json({
        success: true,
        data: {
          featureName,
          cost,
          context
        }
      });
    } else {
      // Get all feature costs
      const costs = await tokenService.getFeatureCosts();
      return NextResponse.json({
        success: true,
        data: costs
      });
    }

  } catch (error) {
    console.error('Feature costs API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get feature costs'
    }, { status: 500 });
  }
}
