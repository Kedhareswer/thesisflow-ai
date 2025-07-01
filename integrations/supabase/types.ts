export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          title: string
          description: string | null
          start_date: string | null
          end_date: string | null
          status: 'planning' | 'active' | 'completed' | 'on-hold'
          progress: number
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: 'planning' | 'active' | 'completed' | 'on-hold'
          progress?: number
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: 'planning' | 'active' | 'completed' | 'on-hold'
          progress?: number
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          due_date: string | null
          priority: 'low' | 'medium' | 'high'
          status: 'todo' | 'in-progress' | 'completed'
          assignee_id: string | null
          estimated_hours: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          due_date?: string | null
          priority?: 'low' | 'medium' | 'high'
          status?: 'todo' | 'in-progress' | 'completed'
          assignee_id?: string | null
          estimated_hours?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          due_date?: string | null
          priority?: 'low' | 'medium' | 'high'
          status?: 'todo' | 'in-progress' | 'completed'
          assignee_id?: string | null
          estimated_hours?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          description: string | null
          is_public: boolean
          category: string
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_public?: boolean
          category?: string
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_public?: boolean
          category?: string
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: 'owner' | 'admin' | 'editor' | 'viewer'
          joined_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'editor' | 'viewer'
          joined_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'editor' | 'viewer'
          joined_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          title: string
          content: string | null
          document_type: 'note' | 'paper' | 'summary' | 'idea'
          file_url: string | null
          mime_type: string | null
          file_size: number | null
          owner_id: string
          team_id: string | null
          project_id: string | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content?: string | null
          document_type?: 'note' | 'paper' | 'summary' | 'idea'
          file_url?: string | null
          mime_type?: string | null
          file_size?: number | null
          owner_id: string
          team_id?: string | null
          project_id?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string | null
          document_type?: 'note' | 'paper' | 'summary' | 'idea'
          file_url?: string | null
          mime_type?: string | null
          file_size?: number | null
          owner_id?: string
          team_id?: string | null
          project_id?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      summaries: {
        Row: {
          id: string
          title: string
          original_content: string | null
          summary_content: string
          key_points: Json | null
          source_type: 'text' | 'file' | 'url' | null
          source_url: string | null
          reading_time: number | null
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          original_content?: string | null
          summary_content: string
          key_points?: Json | null
          source_type?: 'text' | 'file' | 'url' | null
          source_url?: string | null
          reading_time?: number | null
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          original_content?: string | null
          summary_content?: string
          key_points?: Json | null
          source_type?: 'text' | 'file' | 'url' | null
          source_url?: string | null
          reading_time?: number | null
          user_id?: string
          created_at?: string
        }
      }
      research_ideas: {
        Row: {
          id: string
          title: string
          description: string | null
          research_question: string | null
          methodology: string | null
          impact: string | null
          challenges: string | null
          topic: string | null
          context: string | null
          user_id: string
          project_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          research_question?: string | null
          methodology?: string | null
          impact?: string | null
          challenges?: string | null
          topic?: string | null
          context?: string | null
          user_id: string
          project_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          research_question?: string | null
          methodology?: string | null
          impact?: string | null
          challenges?: string | null
          topic?: string | null
          context?: string | null
          user_id?: string
          project_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          team_id: string
          sender_id: string
          content: string
          message_type: 'text' | 'system' | 'file'
          file_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          sender_id: string
          content: string
          message_type?: 'text' | 'system' | 'file'
          file_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          sender_id?: string
          content?: string
          message_type?: 'text' | 'system' | 'file'
          file_url?: string | null
          created_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          institution: string | null
          research_interests: string[] | null
          status: 'online' | 'offline' | 'away'
          last_active: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          institution?: string | null
          research_interests?: string[] | null
          status?: 'online' | 'offline' | 'away'
          last_active?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          institution?: string | null
          research_interests?: string[] | null
          status?: 'online' | 'offline' | 'away'
          last_active?: string
          created_at?: string
          updated_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          entity_type: string | null
          entity_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          entity_type?: string | null
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          entity_type?: string | null
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier use
export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type TaskUpdate = Database['public']['Tables']['tasks']['Update']

export type Team = Database['public']['Tables']['teams']['Row']
export type TeamInsert = Database['public']['Tables']['teams']['Insert']
export type TeamUpdate = Database['public']['Tables']['teams']['Update']

export type TeamMember = Database['public']['Tables']['team_members']['Row']
export type TeamMemberInsert = Database['public']['Tables']['team_members']['Insert']
export type TeamMemberUpdate = Database['public']['Tables']['team_members']['Update']

export type Document = Database['public']['Tables']['documents']['Row']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type DocumentUpdate = Database['public']['Tables']['documents']['Update']

export type Summary = Database['public']['Tables']['summaries']['Row']
export type SummaryInsert = Database['public']['Tables']['summaries']['Insert']
export type SummaryUpdate = Database['public']['Tables']['summaries']['Update']

export type ResearchIdea = Database['public']['Tables']['research_ideas']['Row']
export type ResearchIdeaInsert = Database['public']['Tables']['research_ideas']['Insert']
export type ResearchIdeaUpdate = Database['public']['Tables']['research_ideas']['Update']

export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
export type ChatMessageInsert = Database['public']['Tables']['chat_messages']['Insert']
export type ChatMessageUpdate = Database['public']['Tables']['chat_messages']['Update']

export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']

export type ActivityLog = Database['public']['Tables']['activity_logs']['Row']
export type ActivityLogInsert = Database['public']['Tables']['activity_logs']['Insert']
export type ActivityLogUpdate = Database['public']['Tables']['activity_logs']['Update'] 