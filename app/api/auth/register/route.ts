import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Register user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ error: 'Registration failed' }, { status: 400 });
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: data.user.id,
        email: data.user.email || '',
        full_name: name || (data.user.email ? data.user.email.split('@')[0] : 'User'),
        status: 'online',
        last_active: new Date().toISOString(),
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      // Continue anyway as the auth account was created
    }

    return NextResponse.json({ 
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      }
    });
  } catch (error) {
    console.error('Error in registration:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
