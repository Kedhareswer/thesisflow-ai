import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface Document {
  id: string;
  title: string;
  content: string;
  author: string;
  created_at: string;
  updated_at: string;
  type: 'literature_review' | 'methodology' | 'research_questions' | 'summary' | 'framework';
}

export async function createDocument(document: Omit<Document, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('documents')
    .insert([document])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Document[]
}

export async function getDocument(id: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Document
}

export async function updateDocument(id: string, updates: Partial<Document>) {
  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Document
}

export async function deleteDocument(id: string) {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)

  if (error) throw error
} 