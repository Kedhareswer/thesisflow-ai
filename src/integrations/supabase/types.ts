export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          email: string | null
          role: string
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          role?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          role?: string
          active?: boolean
          created_at?: string
          updated_at?: string
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
  }
}
