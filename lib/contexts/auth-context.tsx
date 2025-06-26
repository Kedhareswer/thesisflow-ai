import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, AuthUser } from '../services/auth.service';
import { presenceService } from '../services/presence.service';

// Context type
interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<boolean>;
  updateProfile: (data: { name?: string; avatar?: string }) => Promise<boolean>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for current user on mount
  useEffect(() => {
    const checkUser = async () => {
      try {
        setIsLoading(true);
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        
        // Initialize presence service if user is logged in
        if (currentUser) {
          presenceService.initialize(currentUser.id);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    // Cleanup on unmount
    return () => {
      presenceService.cleanup();
    };
  }, []);

  // Sign in handler
  const signIn = async (email: string, password: string) => {
    try {
      const { user: authUser, error } = await authService.signIn(email, password);
      
      if (error || !authUser) {
        return { success: false, error: error || 'Authentication failed' };
      }
      
      setUser(authUser);
      
      // Initialize presence
      if (authUser) {
        presenceService.initialize(authUser.id);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error signing in:', error);
      return { success: false, error: 'Authentication failed' };
    }
  };

  // Sign up handler
  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { user: authUser, error } = await authService.signUp(email, password, name);
      
      if (error || !authUser) {
        return { success: false, error: error || 'Registration failed' };
      }
      
      setUser(authUser);
      
      // Initialize presence
      if (authUser) {
        presenceService.initialize(authUser.id);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error signing up:', error);
      return { success: false, error: 'Registration failed' };
    }
  };

  // Sign out handler
  const signOut = async () => {
    try {
      // Clean up presence
      presenceService.cleanup();
      
      const success = await authService.signOut();
      
      if (success) {
        setUser(null);
      }
      
      return success;
    } catch (error) {
      console.error('Error signing out:', error);
      return false;
    }
  };

  // Update profile handler
  const updateProfile = async (data: { name?: string; avatar?: string }) => {
    try {
      if (!user) {
        return false;
      }
      
      const success = await authService.updateProfile(user.id, data);
      
      if (success && data.name) {
        setUser(prev => prev ? { ...prev, name: data.name! } : null);
      }
      
      if (success && data.avatar) {
        setUser(prev => prev ? { ...prev, avatar: data.avatar } : null);
      }
      
      return success;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  };

  // Context value
  const value = {
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
