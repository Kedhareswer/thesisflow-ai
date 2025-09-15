import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { messageId, emoji, action } = await request.json()
    
    if (!messageId || !emoji || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['add', 'remove'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "add" or "remove"' }, { status: 400 })
    }

    // Call the database function to handle the reaction
    const { data, error } = await supabase.rpc('handle_message_reaction', {
      message_id: messageId,
      user_id: user.id,
      emoji: emoji,
      action: action
    })

    if (error) {
      console.error('Error handling reaction:', error)
      return NextResponse.json({ error: 'Failed to update reaction' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      reactions: data 
    })

  } catch (error) {
    console.error('Error in reaction route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')
    
    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 })
    }

    // Get message reactions
    const { data: message, error } = await supabase
      .from('chat_messages')
      .select('reactions')
      .eq('id', messageId)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      reactions: message.reactions || {}
    })

  } catch (error) {
    console.error('Error getting reactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
