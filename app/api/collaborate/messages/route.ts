import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth, createSupabaseAdmin } from '@/lib/auth-utils';

// Messages API endpoints
// Handles: Get team messages, Send messages, Message mentions

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-messages");
    
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // Timestamp for pagination
    const after = searchParams.get('after');   // Timestamp for new messages
    
    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      );
    }

    // Verify user is a member of the team
    const { data: membership } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "You must be a member of this team to view messages" },
        { status: 403 }
      );
    }

    // Try RPC first; if not available, fall back to direct query
    let messages: any[] | null = null
    let rpcError: any = null
    try {
      const rpc = await supabaseAdmin
        .rpc('get_team_messages', {
          p_team_id: teamId,
          p_limit: limit,
          p_before: before || null,
          p_after: after || null
        })
      messages = rpc.data as any[] | null
      rpcError = rpc.error
    } catch (e) {
      rpcError = e
    }

    if (!messages || rpcError) {
      // Fallback: query chat_messages directly
      let query = supabaseAdmin
        .from('chat_messages')
        .select(
          'id, content, message_type, created_at, team_id, sender_id, mentions, metadata'
        )
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (before) query = query.lt('created_at', before)
      if (after) query = query.gt('created_at', after)

      const { data: rows, error: fallbackError } = await query
      if (fallbackError) {
        console.error('Error fetching messages (fallback):', fallbackError, 'RPC error:', rpcError)
        return NextResponse.json(
          { error: 'Failed to fetch messages' },
          { status: 500 }
        )
      }
      messages = rows || []
    }

    // Format messages
    const formattedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      type: msg.message_type,
      timestamp: msg.created_at,
      teamId: msg.team_id,
      senderId: msg.sender_id,
      senderName: msg.sender_id === 'system' ? 'System' : 'Unknown User',
      senderAvatar: msg.sender_id === 'system' ? null : null,
      mentions: msg.mentions || [],
      metadata: msg.metadata || {}
    }));



    // If we were fetching older messages (before), reverse to maintain chronological order
    if (before) {
      formattedMessages.reverse();
    }

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      hasMore: messages?.length === limit
    });
  } catch (error) {
    console.error("Messages GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-messages");
    
    const { teamId, content, type = 'text', mentions = [] } = await request.json();

    if (!teamId || !content?.trim()) {
      return NextResponse.json(
        { error: "Team ID and content are required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      );
    }

    // Verify user is a member of the team
    const { data: membership } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "You must be a member of this team to send messages" },
        { status: 403 }
      );
    }

    // Get team info for notifications
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single();

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Extract mentions from content (format: @username or @user_id)
    const mentionPattern = /@(\w+)/g;
    const contentMentions = [...content.matchAll(mentionPattern)].map(match => match[1]);
    
    // Combine with explicit mentions
    const allMentions = [...new Set([...mentions, ...contentMentions])];
    
    // Validate mentioned users are team members
    let validMentions: string[] = [];
    if (allMentions.length > 0) {
      const { data: mentionedMembers } = await supabaseAdmin
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId)
        .in('user_id', allMentions);

      validMentions = mentionedMembers?.map(m => m.user_id) || [];
    }

    // Insert message
    const { data: message, error: messageError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        team_id: teamId,
        sender_id: user.id,
        content: content.trim(),
        message_type: type,
        mentions: validMentions,
        metadata: {},
        created_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (messageError) {
      console.error('Error creating message:', messageError);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    // Get user profile for notification
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const senderName = userProfile?.full_name || user.email?.split('@')[0] || 'Someone';

    // Create notifications for mentioned users
    if (validMentions.length > 0) {
      const notificationData = {
        message_id: message.id,
        team_id: teamId,
        team_name: team.name,
        sender_id: user.id,
        sender_name: senderName,
        message_preview: content.length > 100 ? content.substring(0, 100) + '...' : content
      };

      for (const mentionedUserId of validMentions) {
        if (mentionedUserId !== user.id) { // Don't notify self
          await supabaseAdmin.rpc('create_notification', {
            target_user_id: mentionedUserId,
            notification_type: 'message_mention',
            notification_title: `Mentioned in ${team.name}`,
            notification_message: `${senderName} mentioned you: "${notificationData.message_preview}"`,
            notification_data: notificationData,
            action_url: `/collaborate?team=${teamId}&message=${message.id}`
          });
        }
      }
    }

    // Also notify all team members about new message (if they have it enabled)
    const { data: teamMembers } = await supabaseAdmin
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .neq('user_id', user.id); // Don't notify sender

    if (teamMembers && teamMembers.length > 0) {
      const notificationData = {
        message_id: message.id,
        team_id: teamId,
        team_name: team.name,
        sender_id: user.id,
        sender_name: senderName,
        message_preview: content.length > 100 ? content.substring(0, 100) + '...' : content
      };

      // Only notify members not already mentioned
      const membersToNotify = teamMembers.filter(
        member => !validMentions.includes(member.user_id)
      );

      for (const member of membersToNotify) {
        await supabaseAdmin.rpc('create_notification', {
          target_user_id: member.user_id,
          notification_type: 'new_message',
          notification_title: `New message in ${team.name}`,
          notification_message: `${senderName}: ${notificationData.message_preview}`,
          notification_data: notificationData,
          action_url: `/collaborate?team=${teamId}`
        });
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
      senderName: message.sender?.full_name || 'Unknown User',
      senderAvatar: message.sender?.avatar_url || null,
      mentions: message.mentions || [],
      metadata: message.metadata || {}
    };

    return NextResponse.json({
      success: true,
      message: formattedMessage
    });
  } catch (error) {
    console.error("Messages POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-messages");
    
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('id');

    if (!messageId) {
      return NextResponse.json(
        { error: "Message ID is required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      );
    }

    // Get the message to check ownership and team
    const { data: message } = await supabaseAdmin
      .from('chat_messages')
      .select('sender_id, team_id')
      .eq('id', messageId)
      .single();

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Check if user is the message sender or team admin/owner
    let canDelete = false;

    if (message.sender_id === user.id) {
      canDelete = true;
    } else {
      const { data: membership } = await supabaseAdmin
        .from('team_members')
        .select('role')
        .eq('team_id', message.team_id)
        .eq('user_id', user.id)
        .single();

      if (membership && ['owner', 'admin'].includes(membership.role)) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return NextResponse.json(
        { error: "You don't have permission to delete this message" },
        { status: 403 }
      );
    }

    // Soft delete by updating content
    const { error: deleteError } = await supabaseAdmin
      .from('chat_messages')
      .update({
        content: '[Message deleted]',
        metadata: { deleted: true, deleted_by: user.id, deleted_at: new Date().toISOString() }
      })
      .eq('id', messageId);

    if (deleteError) {
      console.error('Error deleting message:', deleteError);
      return NextResponse.json(
        { error: "Failed to delete message" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Message deleted successfully"
    });
  } catch (error) {
    console.error("Messages DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
