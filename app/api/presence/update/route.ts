import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, status, timestamp } = body;

    if (!userId || !status) {
      return NextResponse.json({ error: 'User ID and status are required' }, { status: 400 });
    }

    // Update user status in database
    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        status, 
        last_active: timestamp || new Date().toISOString() 
      })
      .eq('id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating presence:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
