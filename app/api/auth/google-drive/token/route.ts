import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin, getAuthUser } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    
    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 })
    }

    const user = await getAuthUser(request, 'google-drive-token')
    if (!user) return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })

    // Direct token exchange with Google (bypass provider class for now)
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET!,
        redirect_uri: `${request.nextUrl.origin}/api/auth/callback/google-drive`,
      })
    })
    
    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`)
    }
    
    const tokenData = await tokenResponse.json()
    
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error)
    }

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })
    
    const googleUser = await userInfoResponse.json()

    // Store or update the provider tokens in database
    const supabaseAdmin = createSupabaseAdmin()
    if (!supabaseAdmin) return NextResponse.json({ error: 'Service configuration error' }, { status: 500 })
    const { error: upsertError } = await supabaseAdmin
      .from('user_storage_providers')
      .upsert({
        user_id: user.id,
        provider: 'google-drive',
        provider_user_id: googleUser.id,
        provider_user_email: googleUser.email,
        provider_user_name: googleUser.name,
        provider_user_avatar: googleUser.picture,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
        scope: tokenData.scope ? tokenData.scope.split(' ') : [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive.metadata.readonly',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ],
        is_active: true,
        updated_at: new Date().toISOString()
      })

    if (upsertError) {
      console.error('[Google Drive OAuth] Database error:', upsertError)
      return NextResponse.json({ error: 'Failed to save authentication' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture
      }
    })

  } catch (error) {
    console.error('[Google Drive OAuth] Token exchange error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Token exchange failed' 
    }, { status: 500 })
  }
}
