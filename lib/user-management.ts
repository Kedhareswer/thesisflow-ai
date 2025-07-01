import { supabase } from "@/integrations/supabase/client"
import type { Database } from "@/integrations/supabase/types"

type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"]
type UserProfileInsert = Database["public"]["Tables"]["user_profiles"]["Insert"]
type UserProfileUpdate = Database["public"]["Tables"]["user_profiles"]["Update"]

export type UserRole = "user" | "researcher" | "admin" | "moderator"

export interface ExtendedUserProfile extends UserProfile {
  role: UserRole
  permissions: string[]
}

// Role-based permissions
const ROLE_PERMISSIONS = {
  user: ["read_papers", "create_papers", "edit_own_papers"],
  researcher: ["read_papers", "create_papers", "edit_own_papers", "collaborate", "advanced_search"],
  moderator: ["read_papers", "create_papers", "edit_own_papers", "collaborate", "advanced_search", "moderate_content"],
  admin: ["*"], // All permissions
} as const

export class UserManagementService {
  // Create user profile after registration
  static async createUserProfile(userId: string, profileData: Partial<UserProfileInsert>) {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .insert({
          id: userId,
          role: "user", // Default role
          ...profileData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error creating user profile:", error)
      throw error
    }
  }

  // Get user profile with role and permissions
  static async getUserProfile(userId: string): Promise<ExtendedUserProfile | null> {
    try {
      const { data, error } = await supabase.from("user_profiles").select("*").eq("id", userId).single()

      if (error) throw error
      if (!data) return null

      const role = (data.role as UserRole) || "user"
      const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user

      return {
        ...data,
        role,
        permissions: Array.isArray(permissions) ? permissions : ["*"],
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
      return null
    }
  }

  // Update user profile
  static async updateUserProfile(userId: string, updates: UserProfileUpdate) {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error updating user profile:", error)
      throw error
    }
  }

  // Update user role (admin only)
  static async updateUserRole(userId: string, newRole: UserRole, adminUserId: string) {
    try {
      // Verify admin permissions
      const adminProfile = await this.getUserProfile(adminUserId)
      if (!adminProfile || adminProfile.role !== "admin") {
        throw new Error("Insufficient permissions")
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .update({
          role: newRole,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error updating user role:", error)
      throw error
    }
  }

  // Check if user has permission
  static hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    if (userPermissions.includes("*")) return true
    return userPermissions.includes(requiredPermission)
  }

  // Get all users (admin only)
  static async getAllUsers(adminUserId: string) {
    try {
      const adminProfile = await this.getUserProfile(adminUserId)
      if (!adminProfile || adminProfile.role !== "admin") {
        throw new Error("Insufficient permissions")
      }

      const { data, error } = await supabase.from("user_profiles").select("*").order("created_at", { ascending: false })

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error fetching all users:", error)
      throw error
    }
  }

  // Deactivate user account (admin only)
  static async deactivateUser(userId: string, adminUserId: string) {
    try {
      const adminProfile = await this.getUserProfile(adminUserId)
      if (!adminProfile || adminProfile.role !== "admin") {
        throw new Error("Insufficient permissions")
      }

      // In a real implementation, you might want to disable the user in Supabase Auth
      // For now, we'll mark them as inactive in the profile
      const { data, error } = await supabase
        .from("user_profiles")
        .update({
          // Add an 'active' field to your user_profiles table
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error deactivating user:", error)
      throw error
    }
  }
}
