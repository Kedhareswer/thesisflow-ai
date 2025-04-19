import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'editor';
  avatar_url?: string;
  status: 'active' | 'invited';
  created_at: string;
}

export async function getTeamMembers() {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as TeamMember[]
}

export async function inviteTeamMember(email: string, role: TeamMember['role']) {
  const { data, error } = await supabase
    .from('team_members')
    .insert([{
      email,
      role,
      status: 'invited'
    }])
    .select()
    .single()

  if (error) throw error
  
  // Here you would typically also send an email invitation
  // using your email service of choice
  
  return data
}

export async function updateTeamMember(id: string, updates: Partial<TeamMember>) {
  const { data, error } = await supabase
    .from('team_members')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as TeamMember
}

export async function removeTeamMember(id: string) {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', id)

  if (error) throw error
} 