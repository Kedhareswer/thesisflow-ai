import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/integrations/supabase/client'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client with service key for file operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key for admin operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Allowed file types and their MIME types
const ALLOWED_FILE_TYPES = {
  // Documents
  'application/pdf': { ext: 'pdf', category: 'document' },
  'application/msword': { ext: 'doc', category: 'document' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', category: 'document' },
  'text/plain': { ext: 'txt', category: 'document' },
  'text/markdown': { ext: 'md', category: 'document' },
  'application/vnd.ms-excel': { ext: 'xls', category: 'document' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: 'xlsx', category: 'document' },
  'application/vnd.ms-powerpoint': { ext: 'ppt', category: 'document' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { ext: 'pptx', category: 'document' },
  
  // Images
  'image/jpeg': { ext: 'jpg', category: 'image' },
  'image/png': { ext: 'png', category: 'image' },
  'image/gif': { ext: 'gif', category: 'image' },
  'image/webp': { ext: 'webp', category: 'image' },
  'image/svg+xml': { ext: 'svg', category: 'image' },
  
  // Archives
  'application/zip': { ext: 'zip', category: 'archive' },
  'application/x-rar-compressed': { ext: 'rar', category: 'archive' },
  'application/x-7z-compressed': { ext: '7z', category: 'archive' },
}

// Maximum file size (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const teamId = formData.get('teamId') as string
    const projectId = formData.get('projectId') as string
    const documentType = formData.get('documentType') as string || 'note'
    const title = formData.get('title') as string
    const description = formData.get('description') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      )
    }

    // Validate file type
    const fileTypeInfo = ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES]
    if (!fileTypeInfo) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed` },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 15)
    const filename = `${timestamp}-${randomStr}.${fileTypeInfo.ext}`
    
    // Determine storage path based on context
    let storagePath: string
    if (teamId) {
      storagePath = `teams/${teamId}/${filename}`
    } else if (projectId) {
      storagePath = `projects/${projectId}/${filename}`
    } else {
      storagePath = `users/${user.id}/${filename}`
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(storagePath)

    // Save document metadata to database
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        title: title || file.name,
        content: description || '',
        document_type: documentType,
        file_url: urlData.publicUrl,
        mime_type: file.type,
        file_size: file.size,
        owner_id: user.id,
        team_id: teamId || null,
        project_id: projectId || null,
        is_public: false
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      
      // Clean up uploaded file if database insert fails
      await supabaseAdmin.storage
        .from('documents')
        .remove([storagePath])
      
      return NextResponse.json(
        { error: 'Failed to save document metadata' },
        { status: 500 }
      )
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: 'file_upload',
        entity_type: 'document',
        entity_id: document.id,
        metadata: {
          filename: file.name,
          file_size: file.size,
          file_type: file.type,
          team_id: teamId,
          project_id: projectId
        }
      })

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        file_url: document.file_url,
        mime_type: document.mime_type,
        file_size: document.file_size,
        created_at: document.created_at
      }
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const projectId = searchParams.get('projectId')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Build query
    let query = supabase
      .from('documents')
      .select(`
        *,
        owner:user_profiles!documents_owner_id_fkey(*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Add filters
    if (teamId) {
      query = query.eq('team_id', teamId)
    } else if (projectId) {
      query = query.eq('project_id', projectId)
    } else {
      // User's own documents
      query = query.eq('owner_id', user.id)
    }

    if (type) {
      query = query.eq('document_type', type)
    }

    const { data: documents, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      documents: documents || []
    })

  } catch (error) {
    console.error('Fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID required' },
        { status: 400 }
      )
    }

    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get document to verify ownership and get file path
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .single()

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // Extract storage path from URL
    const url = new URL(document.file_url)
    const pathSegments = url.pathname.split('/')
    const storagePath = pathSegments.slice(pathSegments.indexOf('documents') + 1).join('/')

    // Delete from storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('documents')
      .remove([storagePath])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      console.error('Database delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      )
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: 'file_delete',
        entity_type: 'document',
        entity_id: documentId,
        metadata: {
          title: document.title,
          file_size: document.file_size
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    })

  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
