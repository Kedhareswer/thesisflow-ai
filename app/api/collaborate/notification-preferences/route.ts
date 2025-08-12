import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireAuth, createSupabaseAdmin } from '@/lib/auth-utils'

// Notification Preferences API endpoints
// Handles: Get preferences, Update preferences

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-notification-preferences")
    
    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      )
    }

    // Get user's notification preferences
    const { data: preferences, error } = await supabaseAdmin
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching notification preferences:', error)
      return NextResponse.json(
        { error: "Failed to fetch notification preferences" },
        { status: 500 }
      )
    }

    // If no preferences exist, create default ones
    if (!preferences) {
      const defaultPreferences = {
        user_id: user.id,
        team_invitations: true,
        new_messages: true,
        system_updates: true,
        email_notifications: false, // Off by default for future use
        push_notifications: true,   // On by default for future use
        marketing_emails: false     // Off by default
      }

      const { data: newPreferences, error: createError } = await supabaseAdmin
        .from('user_notification_preferences')
        .insert(defaultPreferences)
        .select()
        .single()

      if (createError) {
        console.error('Error creating default preferences:', createError)
        return NextResponse.json(
          { error: "Failed to create notification preferences" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        preferences: newPreferences,
        isDefault: true
      })
    }

    return NextResponse.json({
      success: true,
      preferences,
      isDefault: false
    })

  } catch (error) {
    console.error("Notification Preferences GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-notification-preferences")
    
    const updates = await request.json()

    // Validate that only boolean values are provided for valid fields
    const validFields = [
      'team_invitations',
      'new_messages',
      'system_updates',
      'email_notifications',
      'push_notifications',
      'marketing_emails'
    ]

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Only include valid fields with boolean values
    for (const field of validFields) {
      if (field in updates && typeof updates[field] === 'boolean') {
        updateData[field] = updates[field]
      }
    }

    if (Object.keys(updateData).length === 1) { // Only has updated_at
      return NextResponse.json(
        { error: "No valid preference updates provided" },
        { status: 400 }
      )
    }

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      )
    }

    // Check if preferences exist
    const { data: existing } = await supabaseAdmin
      .from('user_notification_preferences')
      .select('id')
      .eq('user_id', user.id)
      .single()

    let preferences

    if (existing) {
      // Update existing preferences
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('user_notification_preferences')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating preferences:', updateError)
        return NextResponse.json(
          { error: "Failed to update notification preferences" },
          { status: 500 }
        )
      }

      preferences = updated
    } else {
      // Create new preferences with the updates
      const newPreferences = {
        user_id: user.id,
        team_invitations: updates.team_invitations ?? true,
        member_added: updates.member_added ?? true,
        new_messages: updates.new_messages ?? true,
        message_mentions: updates.message_mentions ?? true,
        document_shared: updates.document_shared ?? true,
        role_changes: updates.role_changes ?? true,
        email_notifications: updates.email_notifications ?? false,
        push_notifications: updates.push_notifications ?? true,
        ...updateData
      }

      const { data: created, error: createError } = await supabaseAdmin
        .from('user_notification_preferences')
        .insert(newPreferences)
        .select()
        .single()

      if (createError) {
        console.error('Error creating preferences:', createError)
        return NextResponse.json(
          { error: "Failed to create notification preferences" },
          { status: 500 }
        )
      }

      preferences = created
    }

    return NextResponse.json({
      success: true,
      preferences,
      message: "Notification preferences updated successfully"
    })

  } catch (error) {
    console.error("Notification Preferences PUT error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-notification-preferences")
    
    const { action } = await request.json()

    if (!action || !['enable-all', 'disable-all'].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'enable-all' or 'disable-all'" },
        { status: 400 }
      )
    }

    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      )
    }

    const allEnabled = action === 'enable-all'
    
    const updateData = {
      team_invitations: allEnabled,
      new_messages: allEnabled,
      system_updates: allEnabled,
      // Don't change email/push/marketing notifications with bulk actions
      updated_at: new Date().toISOString()
    }

    // Check if preferences exist
    const { data: existing } = await supabaseAdmin
      .from('user_notification_preferences')
      .select('id')
      .eq('user_id', user.id)
      .single()

    let preferences

    if (existing) {
      // Update existing preferences
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('user_notification_preferences')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating preferences:', updateError)
        return NextResponse.json(
          { error: "Failed to update notification preferences" },
          { status: 500 }
        )
      }

      preferences = updated
    } else {
      // Create new preferences
      const newPreferences = {
        user_id: user.id,
        ...updateData,
        email_notifications: false,
        push_notifications: true
      }

      const { data: created, error: createError } = await supabaseAdmin
        .from('user_notification_preferences')
        .insert(newPreferences)
        .select()
        .single()

      if (createError) {
        console.error('Error creating preferences:', createError)
        return NextResponse.json(
          { error: "Failed to create notification preferences" },
          { status: 500 }
        )
      }

      preferences = created
    }

    return NextResponse.json({
      success: true,
      preferences,
      message: `All notifications ${allEnabled ? 'enabled' : 'disabled'} successfully`
    })

  } catch (error) {
    console.error("Notification Preferences POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
