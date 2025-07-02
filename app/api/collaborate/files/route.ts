import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireAuth, createSupabaseAdmin } from '@/lib/auth-utils'

// Team Files API endpoints
// Handles: Get files, Upload files, Update metadata, Delete files

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-files")
    
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const type = searchParams.get('type') // 'file' | 'link' | 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

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

    let allFiles: any[] = []

    // Fetch files if requested
    if (type === 'file' || type === 'all' || !type) {
      const { data: files, error: filesError } = await supabaseAdmin
        .from('team_files')
        .select(`
          id,
          file_name,
          file_type,
          file_size,
          file_url,
          description,
          tags,
          is_public,
          download_count,
          version,
          created_at,
          updated_at,
          uploader_id
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (filesError) {
        console.error("Files query error:", filesError)
        return NextResponse.json(
          { error: "Failed to fetch files" },
          { status: 500 }
        )
      }

      // Get uploader details separately to avoid join complexity
      const uploaderIds = files?.map(f => f.uploader_id).filter(Boolean) || []
      let uploaderMap: Record<string, any> = {}
      
      if (uploaderIds.length > 0) {
        const { data: uploaders } = await supabaseAdmin
          .from('user_profiles')
          .select('id, display_name, full_name, email, avatar_url')
          .in('id', uploaderIds)
        
        uploaderMap = Object.fromEntries(
          uploaders?.map(u => [u.id, u]) || []
        )
      }

      const formattedFiles = files?.map(file => {
        const uploader = uploaderMap[file.uploader_id]
        return {
          id: file.id,
          name: file.file_name,
          type: 'file',
          mime_type: file.file_type,
          size: file.file_size,
          url: file.file_url,
          uploaded_by: file.uploader_id,
          uploaded_by_name: uploader?.display_name || uploader?.full_name || uploader?.email || 'Unknown',
          uploaded_by_avatar: uploader?.avatar_url,
          created_at: file.created_at,
          updated_at: file.updated_at,
          description: file.description,
          tags: file.tags || [],
          is_public: file.is_public,
          download_count: file.download_count,
          version: file.version,
          team_id: teamId
        }
      }) || []

      allFiles = [...allFiles, ...formattedFiles]
    }

    // Fetch shared links if requested
    if (type === 'link' || type === 'all' || !type) {
      const { data: links, error: linksError } = await supabaseAdmin
        .from('team_shared_links')
        .select(`
          id,
          platform,
          url,
          title,
          description,
          access_level,
          is_active,
          click_count,
          created_at,
          updated_at,
          shared_by_id
        `)
        .eq('team_id', teamId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (linksError) {
        console.error("Links query error:", linksError)
        return NextResponse.json(
          { error: "Failed to fetch shared links" },
          { status: 500 }
        )
      }

      // Get sharer details separately
      const sharerIds = links?.map(l => l.shared_by_id).filter(Boolean) || []
      let sharerMap: Record<string, any> = {}
      
      if (sharerIds.length > 0) {
        const { data: sharers } = await supabaseAdmin
          .from('user_profiles')
          .select('id, display_name, full_name, email, avatar_url')
          .in('id', sharerIds)
        
        sharerMap = Object.fromEntries(
          sharers?.map(s => [s.id, s]) || []
        )
      }

      const formattedLinks = links?.map(link => {
        const sharer = sharerMap[link.shared_by_id]
        return {
          id: link.id,
          name: link.title,
          type: 'link',
          url: link.url,
          uploaded_by: link.shared_by_id,
          uploaded_by_name: sharer?.display_name || sharer?.full_name || sharer?.email || 'Unknown',
          uploaded_by_avatar: sharer?.avatar_url,
          created_at: link.created_at,
          updated_at: link.updated_at,
          description: link.description,
          platform: link.platform,
          access_level: link.access_level,
          click_count: link.click_count,
          team_id: teamId
        }
      }) || []

      allFiles = [...allFiles, ...formattedLinks]
    }

    // Sort all files by creation date
    allFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({
      success: true,
      files: allFiles,
      hasMore: allFiles.length === limit
    })

  } catch (error) {
    console.error("Files GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-files")
    
    const body = await request.json()
    const { teamId, type, name, url, description, tags, isPublic, platform, fileType, fileSize } = body

    if (!teamId || !name) {
      return NextResponse.json(
        { error: "Team ID and name are required" },
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

    // Verify user is a member with upload permissions
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

    if (!['owner', 'admin', 'editor'].includes(membership.role)) {
      return NextResponse.json(
        { error: "Permission denied. You need editor permissions to add files." },
        { status: 403 }
      )
    }

    let newItem = null

    if (type === 'file') {
      // Insert into team_files table
      const { data: file, error: fileError } = await supabaseAdmin
        .from('team_files')
        .insert({
          team_id: teamId,
          uploader_id: user.id,
          file_name: name,
          file_type: fileType || 'application/octet-stream',
          file_size: fileSize || 0,
          file_url: url || '', // In real implementation, this would be the uploaded file URL
          description: description || '',
          tags: tags || [],
          is_public: isPublic || false
        })
        .select(`
          id,
          file_name,
          file_type,
          file_size,
          file_url,
          description,
          tags,
          is_public,
          download_count,
          version,
          created_at,
          updated_at
        `)
        .single()

      if (fileError) {
        console.error("File insert error:", fileError)
        return NextResponse.json(
          { error: "Failed to create file record" },
          { status: 500 }
        )
      }

      newItem = {
        id: file.id,
        name: file.file_name,
        type: 'file',
        mime_type: file.file_type,
        size: file.file_size,
        url: file.file_url,
        uploaded_by: user.id,
        uploaded_by_name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.email,
        uploaded_by_avatar: user.user_metadata?.avatar_url,
        created_at: file.created_at,
        updated_at: file.updated_at,
        description: file.description,
        tags: file.tags,
        is_public: file.is_public,
        download_count: file.download_count,
        version: file.version,
        team_id: teamId
      }
    } else {
      // Insert into team_shared_links table
      const { data: link, error: linkError } = await supabaseAdmin
        .from('team_shared_links')
        .insert({
          team_id: teamId,
          shared_by_id: user.id,
          platform: platform || 'custom',
          url: url || '',
          title: name,
          description: description || '',
          access_level: 'view'
        })
        .select(`
          id,
          platform,
          url,
          title,
          description,
          access_level,
          is_active,
          click_count,
          created_at,
          updated_at
        `)
        .single()

      if (linkError) {
        console.error("Link insert error:", linkError)
        return NextResponse.json(
          { error: "Failed to create shared link" },
          { status: 500 }
        )
      }

      newItem = {
        id: link.id,
        name: link.title,
        type: 'link',
        url: link.url,
        uploaded_by: user.id,
        uploaded_by_name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.email,
        uploaded_by_avatar: user.user_metadata?.avatar_url,
        created_at: link.created_at,
        updated_at: link.updated_at,
        description: link.description,
        platform: link.platform,
        access_level: link.access_level,
        click_count: link.click_count,
        team_id: teamId
      }
    }

    return NextResponse.json({
      success: true,
      file: newItem,
      message: type === 'file' ? "File uploaded successfully" : "Link added successfully"
    })

  } catch (error) {
    console.error("Files POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request, "collaborate-files")
    
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('id')
    const teamId = searchParams.get('teamId')
    const type = searchParams.get('type') // 'file' | 'link'

    if (!fileId || !teamId) {
      return NextResponse.json(
        { error: "File ID and Team ID are required" },
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

    // Check if user can delete (owner/admin/uploader)
    const canDeleteAsAdmin = ['owner', 'admin'].includes(membership.role)
    
    if (type === 'file') {
      // Check if user is the uploader or admin
      const { data: file } = await supabaseAdmin
        .from('team_files')
        .select('uploader_id')
        .eq('id', fileId)
        .eq('team_id', teamId)
        .single()

      if (!file) {
        return NextResponse.json(
          { error: "File not found" },
          { status: 404 }
        )
      }

      const canDelete = canDeleteAsAdmin || file.uploader_id === user.id

      if (!canDelete) {
        return NextResponse.json(
          { error: "Permission denied. You can only delete your own files or need admin permissions." },
          { status: 403 }
        )
      }

      // Delete from team_files
      const { error: deleteError } = await supabaseAdmin
        .from('team_files')
        .delete()
        .eq('id', fileId)
        .eq('team_id', teamId)

      if (deleteError) {
        console.error("File delete error:", deleteError)
        return NextResponse.json(
          { error: "Failed to delete file" },
          { status: 500 }
        )
      }
    } else {
      // Check if user is the sharer or admin
      const { data: link } = await supabaseAdmin
        .from('team_shared_links')
        .select('shared_by_id')
        .eq('id', fileId)
        .eq('team_id', teamId)
        .single()

      if (!link) {
        return NextResponse.json(
          { error: "Link not found" },
          { status: 404 }
        )
      }

      const canDelete = canDeleteAsAdmin || link.shared_by_id === user.id

      if (!canDelete) {
        return NextResponse.json(
          { error: "Permission denied. You can only delete your own links or need admin permissions." },
          { status: 403 }
        )
      }

      // Delete from team_shared_links
      const { error: deleteError } = await supabaseAdmin
        .from('team_shared_links')
        .delete()
        .eq('id', fileId)
        .eq('team_id', teamId)

      if (deleteError) {
        console.error("Link delete error:", deleteError)
        return NextResponse.json(
          { error: "Failed to delete link" },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: type === 'file' ? "File deleted successfully" : "Link deleted successfully"
    })

  } catch (error) {
    console.error("Files DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
