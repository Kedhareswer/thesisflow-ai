import { supabase } from '../supabase';
import { User } from './collaborate.service';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

class AuthService {
  // Get current authenticated user
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      // Get session from Supabase
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return null;
      }
      
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileError || !profile) {
        // Create profile if it doesn't exist
        if (session.user.email) {
          const { data: newProfile } = await supabase
            .from('user_profiles')
            .insert({
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.email.split('@')[0],
              status: 'online',
              last_active: new Date().toISOString(),
            })
            .select()
            .single();
            
          if (newProfile) {
            return {
              id: newProfile.id,
              email: newProfile.email,
              name: newProfile.full_name,
              avatar: newProfile.avatar_url || undefined,
            };
          }
        }
        return null;
      }
      
      return {
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        avatar: profile.avatar_url || undefined,
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }
  
  // Sign in with email and password
  async signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { user: null, error: error.message };
      }
      
      if (!data.user) {
        return { user: null, error: 'Authentication failed' };
      }
      
      // Get or create user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (profileError || !profile) {
        // Create profile
        const { data: newProfile } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: data.user.email || '',
            full_name: data.user.email ? data.user.email.split('@')[0] : 'User',
            status: 'online',
            last_active: new Date().toISOString(),
          })
          .select()
          .single();
          
        if (newProfile) {
          return {
            user: {
              id: newProfile.id,
              email: newProfile.email,
              name: newProfile.full_name,
              avatar: newProfile.avatar_url || undefined,
            },
            error: null,
          };
        }
      }
      
      return {
        user: profile ? {
          id: profile.id,
          email: profile.email,
          name: profile.full_name,
          avatar: profile.avatar_url || undefined,
        } : null,
        error: null,
      };
    } catch (error) {
      console.error('Error signing in:', error);
      return { user: null, error: 'Authentication failed' };
    }
  }
  
  // Sign up with email and password
  async signUp(email: string, password: string, name: string): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        return { user: null, error: error.message };
      }
      
      if (!data.user) {
        return { user: null, error: 'Registration failed' };
      }
      
      // Create user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          email: data.user.email || '',
          full_name: name || (data.user.email ? data.user.email.split('@')[0] : 'User'),
          status: 'online',
          last_active: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (profileError) {
        return { user: null, error: 'Failed to create user profile' };
      }
      
      return {
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.full_name,
          avatar: profile.avatar_url || undefined,
        },
        error: null,
      };
    } catch (error) {
      console.error('Error signing up:', error);
      return { user: null, error: 'Registration failed' };
    }
  }
  
  // Sign out
  async signOut(): Promise<boolean> {
    try {
      const { error } = await supabase.auth.signOut();
      return !error;
    } catch (error) {
      console.error('Error signing out:', error);
      return false;
    }
  }
  
  // Update user profile
  async updateProfile(userId: string, data: { name?: string; avatar?: string }): Promise<boolean> {
    try {
      const updates: any = {};
      
      if (data.name) {
        updates.full_name = data.name;
      }
      
      if (data.avatar) {
        updates.avatar_url = data.avatar;
      }
      
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId);
      
      return !error;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  }
  
  // Get user by ID
  async getUserById(userId: string): Promise<AuthUser | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return {
        id: data.id,
        email: data.email,
        name: data.full_name,
        avatar: data.avatar_url || undefined,
      };
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }
}

// Create singleton instance
export const authService = new AuthService();
