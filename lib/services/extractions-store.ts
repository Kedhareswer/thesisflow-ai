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
  if (!supabaseUtils.isConfigured()) return []
  const { data, error } = await supabase
    .from('extractions' as any)
    .select('id, file_name, file_type, file_size, summary, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    supabaseUtils.logError('fetchRecentExtractions', error)
    return []
  }
  return (data || []) as RecentExtraction[]
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
  if (!supabaseUtils.isConfigured()) return { success: false }
  try {
    const { error } = await supabase
      .from('extractions' as any)
      .delete()
      .eq('id', id)
    if (error) {
      supabaseUtils.logError('deleteExtraction', error)
      return { success: false, error }
    }
    return { success: true }
  } catch (error) {
    supabaseUtils.logError('deleteExtraction/catch', error)
    return { success: false, error }
  }
}

// Clear all extractions for current user
export async function clearAllExtractions() {
  if (!supabaseUtils.isConfigured()) return { success: false, error: 'Not configured' }
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) {
      return { success: false, error: 'No active session' }
    }
    const { error } = await supabase
      .from('extractions' as any)
      .delete()
      .eq('user_id', userId)
    if (error) {
      supabaseUtils.logError('clearAllExtractions', error)
      return { success: false, error }
    }
    return { success: true }
  } catch (error) {
    supabaseUtils.logError('clearAllExtractions/catch', error)
    return { success: false, error }
  }
}
