import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Administrative endpoint to reset monthly tokens for all users
 * Should be called via cron job daily to ensure monthly rollover
 */
export async function POST(request: NextRequest) {
  try {
    // Check for admin authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret) {
      return NextResponse.json(
        { error: 'Cron jobs not configured' }, 
        { status: 503 }
      );
    }
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Create Supabase admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Call the automatic reset function that works independently of user activity
    const { data, error } = await supabase.rpc('auto_reset_monthly_tokens');

    if (error) {
      console.error('Error resetting monthly tokens:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          message: 'Failed to reset monthly tokens' 
        }, 
        { status: 500 }
      );
    }

    console.log('Monthly token reset completed:', data);
    
    return NextResponse.json({
      success: true,
      ...data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Monthly token reset error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: 'Failed to process monthly token reset' 
      }, 
      { status: 500 }
    );
  }
}

// Also allow GET for manual testing (with same auth)
export async function GET(request: NextRequest) {
  return POST(request);
}
