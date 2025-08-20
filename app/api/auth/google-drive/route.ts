import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleDriveProvider } from '@/lib/storage/providers/google-drive'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('[Google Drive OAuth] User not authenticated:', userError)
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    // Initialize Google Drive provider
    const provider = new GoogleDriveProvider()
    
    // Generate OAuth URL
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID!,
      redirect_uri: `${request.nextUrl.origin}/api/auth/callback/google-drive`,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      access_type: 'offline',
      prompt: 'consent'
    })
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    return NextResponse.json({ 
      success: true, 
      authUrl 
    })

  } catch (error) {
    console.error('[Google Drive OAuth] Init error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to initialize OAuth' 
    }, { status: 500 })
  }
}

// Get user's storage provider status
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    // Check if user has Google Drive connected
    const { data: providers, error: queryError } = await supabase
      .from('user_storage_providers')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google-drive')
      .eq('is_active', true)

    if (queryError) {
      console.error('[Google Drive] Query error:', queryError)
      return NextResponse.json({ error: 'Failed to check provider status' }, { status: 500 })
    }

    const isConnected = providers && providers.length > 0
    const providerData = isConnected ? providers[0] : null

    return NextResponse.json({ 
      success: true, 
      connected: isConnected,
      provider: providerData ? {
        provider_user_email: providerData.provider_user_email,
        provider_user_name: providerData.provider_user_name,
        provider_user_avatar: providerData.provider_user_avatar,
        connected_at: providerData.created_at
      } : null
    })

  } catch (error) {
    console.error('[Google Drive] Status check error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to check provider status' 
    }, { status: 500 })
  }
}

// Disconnect Google Drive
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    // Deactivate the provider
    const { error: updateError } = await supabase
      .from('user_storage_providers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('provider', 'google-drive')

    if (updateError) {
      console.error('[Google Drive] Disconnect error:', updateError)
      return NextResponse.json({ error: 'Failed to disconnect provider' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Google Drive disconnected successfully' 
    })

  } catch (error) {
    console.error('[Google Drive] Disconnect error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to disconnect provider' 
    }, { status: 500 })
  }
}
