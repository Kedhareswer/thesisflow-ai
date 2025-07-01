import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/collaborate/messages - Get messages for a team
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // Timestamp for pagination
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    // Build query
    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Add pagination if before timestamp is provided
    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get user info for message senders
    const userIds = [...new Set(messages
      .filter(msg => msg.sender_id !== 'system')
      .map(msg => msg.sender_id))];
    
    let userProfiles: Record<string, { name: string; avatar: string | null }> = {};
    
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (!profilesError && profiles) {
        userProfiles = profiles.reduce((acc, profile) => {
          acc[profile.id] = {
            name: profile.full_name,
            avatar: profile.avatar_url
          };
          return acc;
        }, {} as Record<string, { name: string; avatar: string | null }>);
      }
    }

    // Format messages with sender info
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      type: msg.message_type,
      timestamp: msg.created_at,
      teamId: msg.team_id,
      senderId: msg.sender_id,
      senderName: msg.sender_id === 'system' 
        ? 'System' 
        : userProfiles[msg.sender_id]?.name || 'Unknown User',
      senderAvatar: msg.sender_id === 'system'
        ? null
        : userProfiles[msg.sender_id]?.avatar || null
    })).reverse(); // Reverse to get chronological order

    return NextResponse.json({ messages: formattedMessages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/collaborate/messages - Send a new message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, userId, content, type = 'text' } = body;

    if (!teamId || !userId || !content) {
      return NextResponse.json({ 
        error: 'Team ID, user ID, and content are required' 
      }, { status: 400 });
    }

    // Check if team exists
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if user is a member of the team (except for system messages)
    if (userId !== 'system') {
      const { data: membership, error: membershipError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single();

      if (membershipError || !membership) {
        return NextResponse.json({ 
          error: 'User is not a member of this team' 
        }, { status: 403 });
      }
    }

    // Insert message
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        team_id: teamId,
        sender_id: userId,
        content,
        message_type: type,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 500 });
    }

    // Get sender info if not system
    let senderName = 'System';
    let senderAvatar = null;

    if (userId !== 'system') {
      const { data: user, error: userError } = await supabase
        .from('user_profiles')
        .select('full_name, avatar_url')
        .eq('id', userId)
        .single();

      if (!userError && user) {
        senderName = user.full_name;
        senderAvatar = user.avatar_url;
      }
    }

    // Format response
    const formattedMessage = {
      id: message.id,
      content: message.content,
      type: message.message_type,
      timestamp: message.created_at,
      teamId: message.team_id,
      senderId: message.sender_id,
      senderName,
      senderAvatar
    };

    return NextResponse.json({ 
      success: true, 
      message: formattedMessage 
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
