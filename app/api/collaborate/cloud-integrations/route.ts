import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireAuth, createSupabaseAdmin } from '@/lib/auth-utils'

// Team Cloud Integrations API endpoints
// Handles: Get integrations, Create integrations, Update settings, Delete integrations

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-integrations")
    
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
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

    // Verify user is a member of the team
    const { data: membership } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied. You must be a member of this team." },
        { status: 403 }
      )
    }

    // Fetch cloud integrations
    const { data: integrations, error: integrationsError } = await supabaseAdmin
      .from('team_cloud_integrations')
      .select(`
        id,
        service_name,
        service_account,
        permissions,
        sync_enabled,
        auto_sync,
        last_sync_at,
        sync_status,
        sync_error,
        folders_synced,
        created_at,
        updated_at,
        connected_by_id
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    if (integrationsError) {
      console.error("Cloud integrations query error:", integrationsError)
      return NextResponse.json(
        { error: "Failed to fetch cloud integrations" },
        { status: 500 }
      )
    }

    const formattedIntegrations = integrations?.map(integration => ({
      id: integration.id,
      service: integration.service_name,
      account: integration.service_account,
      permissions: integration.permissions,
      syncEnabled: integration.sync_enabled,
      autoSync: integration.auto_sync,
      lastSyncAt: integration.last_sync_at,
      syncStatus: integration.sync_status,
      syncError: integration.sync_error,
      foldersSynced: integration.folders_synced,
      connectedBy: integration.connected_by_id,
      createdAt: integration.created_at,
      updatedAt: integration.updated_at,
      teamId: teamId
    })) || []

    return NextResponse.json({
      success: true,
      integrations: formattedIntegrations
    })

  } catch (error) {
    console.error("Cloud integrations GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-integrations")
    
    const body = await request.json()
    const { teamId, serviceName, serviceAccount, permissions, syncEnabled, autoSync } = body

    if (!teamId || !serviceName || !serviceAccount) {
      return NextResponse.json(
        { error: "Team ID, service name, and service account are required" },
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

    // Verify user is an admin of the team
    const { data: membership } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied. You must be a member of this team." },
        { status: 403 }
      )
    }

    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: "Permission denied. You need admin permissions to manage integrations." },
        { status: 403 }
      )
    }

    // Insert cloud integration
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('team_cloud_integrations')
      .insert({
        team_id: teamId,
        connected_by_id: user.id,
        service_name: serviceName,
        service_account: serviceAccount,
        permissions: permissions || { read: true, write: false, share: false },
        sync_enabled: syncEnabled !== undefined ? syncEnabled : true,
        auto_sync: autoSync !== undefined ? autoSync : false
      })
      .select()
      .single()

    if (integrationError) {
      console.error("Cloud integration insert error:", integrationError)
      return NextResponse.json(
        { error: "Failed to create cloud integration" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        service: integration.service_name,
        account: integration.service_account,
        permissions: integration.permissions,
        syncEnabled: integration.sync_enabled,
        autoSync: integration.auto_sync,
        connectedBy: user.id,
        createdAt: integration.created_at,
        teamId: teamId
      },
      message: "Cloud integration connected successfully"
    })

  } catch (error) {
    console.error("Cloud integrations POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-integrations")
    
    const body = await request.json()
    const { integrationId, teamId, syncEnabled, autoSync, permissions } = body

    if (!integrationId || !teamId) {
      return NextResponse.json(
        { error: "Integration ID and Team ID are required" },
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

    // Verify user permissions
    const { data: membership } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    // Check if user can update (admin or connector)
    const { data: integration } = await supabaseAdmin
      .from('team_cloud_integrations')
      .select('connected_by_id')
      .eq('id', integrationId)
      .eq('team_id', teamId)
      .single()

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      )
    }

    const canUpdate = ['owner', 'admin'].includes(membership.role) || integration.connected_by_id === user.id

    if (!canUpdate) {
      return NextResponse.json(
        { error: "Permission denied. You can only update integrations you connected or need admin permissions." },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (syncEnabled !== undefined) updateData.sync_enabled = syncEnabled
    if (autoSync !== undefined) updateData.auto_sync = autoSync
    if (permissions !== undefined) updateData.permissions = permissions
    updateData.updated_at = new Date().toISOString()

    // Update integration
    const { error: updateError } = await supabaseAdmin
      .from('team_cloud_integrations')
      .update(updateData)
      .eq('id', integrationId)
      .eq('team_id', teamId)

    if (updateError) {
      console.error("Cloud integration update error:", updateError)
      return NextResponse.json(
        { error: "Failed to update cloud integration" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Integration updated successfully"
    })

  } catch (error) {
    console.error("Cloud integrations PUT error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-integrations")
    
    const { searchParams } = new URL(request.url)
    const integrationId = searchParams.get('id')
    const teamId = searchParams.get('teamId')

    if (!integrationId || !teamId) {
      return NextResponse.json(
        { error: "Integration ID and Team ID are required" },
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

    // Verify user permissions
    const { data: membership } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    // Check if user can delete (admin or connector)
    const { data: integration } = await supabaseAdmin
      .from('team_cloud_integrations')
      .select('connected_by_id')
      .eq('id', integrationId)
      .eq('team_id', teamId)
      .single()

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      )
    }

    const canDelete = ['owner', 'admin'].includes(membership.role) || integration.connected_by_id === user.id

    if (!canDelete) {
      return NextResponse.json(
        { error: "Permission denied. You can only delete integrations you connected or need admin permissions." },
        { status: 403 }
      )
    }

    // Delete integration
    const { error: deleteError } = await supabaseAdmin
      .from('team_cloud_integrations')
      .delete()
      .eq('id', integrationId)
      .eq('team_id', teamId)

    if (deleteError) {
      console.error("Cloud integration delete error:", deleteError)
      return NextResponse.json(
        { error: "Failed to delete cloud integration" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Integration disconnected successfully"
    })

  } catch (error) {
    console.error("Cloud integrations DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
