import { supabase, supabaseUtils } from '@/integrations/supabase/client'

export type RecentExtraction = {
  id: string
  file_name: string
  file_type: string
  file_size: number
  summary: string | null
  created_at: string
}

export type ExtractionWithChats = {
  id: string
  file_name: string
  file_type: string
  file_size: number
  summary: string | null
  created_at: string
  result_json: any
  chats: Array<{ id: string; role: 'user' | 'assistant'; content: string; created_at: string }>
}

export async function fetchRecentExtractions(limit = 10): Promise<RecentExtraction[]> {
  try {
    const { data: sessionRes } = await supabase.auth.getSession()
    const accessToken = sessionRes?.session?.access_token
    const res = await fetch(`/api/extractions/recent?limit=${encodeURIComponent(String(limit))}` , {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      cache: 'no-store',
    })
    if (!res.ok) {
      return []
    }
    const body = await res.json().catch(() => ({}))
    return Array.isArray(body.items) ? (body.items as RecentExtraction[]) : []
  } catch (e) {
    supabaseUtils.logError('fetchRecentExtractions/fetch', e)
    return []
  }
}

export async function fetchExtractionWithChats(id: string): Promise<ExtractionWithChats | null> {
  if (!supabaseUtils.isConfigured()) return null
  const { data, error } = await supabase
    .from('extractions' as any)
    .select('id, file_name, file_type, file_size, summary, created_at, result_json')
    .eq('id', id)
    .single()
  if (error || !data) {
    supabaseUtils.logError('fetchExtractionWithChats/select extraction', error)
    return null
  }
  const { data: chats, error: chatsError } = await supabase
    .from('extraction_chats' as any)
    .select('id, role, content, created_at')
    .eq('extraction_id', id)
    .order('created_at', { ascending: true })
  if (chatsError) {
    supabaseUtils.logError('fetchExtractionWithChats/select chats', chatsError)
  }
  return { ...(data as any), chats: (chats || []) as any }
}

export async function saveChatMessage(extractionId: string, role: 'user' | 'assistant', content: string) {
  if (!supabaseUtils.isConfigured()) return { success: false }
  const { error } = await supabase
    .from('extraction_chats' as any)
    .insert({ extraction_id: extractionId, role, content })
  if (error) {
    supabaseUtils.logError('saveChatMessage', error)
    return { success: false, error }
  }
  return { success: true }
}

// Delete a single extraction (and its chats via cascade)
export async function deleteExtraction(id: string) {
  try {
    const { data: sessionRes } = await supabase.auth.getSession()
    const accessToken = sessionRes?.session?.access_token
    const res = await fetch(`/api/extractions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    })
    const body = await res.json().catch(() => ({}))
    return { success: !!body?.success, error: body?.error }
  } catch (error) {
    supabaseUtils.logError('deleteExtraction/fetch', error)
    return { success: false, error }
  }
}

// Clear all extractions for current user
export async function clearAllExtractions() {
  try {
    const { data: sessionRes } = await supabase.auth.getSession()
    const accessToken = sessionRes?.session?.access_token
    const res = await fetch('/api/extractions/clear', {
      method: 'DELETE',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    })
    const body = await res.json().catch(() => ({}))
    return { success: !!body?.success, error: body?.error }
  } catch (error) {
    supabaseUtils.logError('clearAllExtractions/fetch', error)
    return { success: false, error }
  }
}
