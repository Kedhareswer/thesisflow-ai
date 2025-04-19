"use client"

import type React from "react"

import { useContext, useEffect, useState } from "react"
import {
  AuthContext,
  type SubscriptionDetails,
  type SubscriptionTier,
  type User,
  getCurrentUser,
  getSubscriptionDetails,
  loginUser,
  logoutUser,
  upgradeSubscription,
  createUserAccount,
} from "@/lib/auth"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load user from storage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)

        if (currentUser) {
          const userSubscription = await getSubscriptionDetails(currentUser.id)
          setSubscription(userSubscription)
        }
      } catch (error) {
        console.error("Error loading user:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  const login = async (email: string, password: string, rememberMe?: boolean) => {
    try {
      const loggedInUser = await loginUser({ email, password, rememberMe })
      setUser(loggedInUser)

      const userSubscription = await getSubscriptionDetails(loggedInUser.id)
      setSubscription(userSubscription)
    } catch (error) {
      console.error("Error logging in:", error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await logoutUser()
      setUser(null)
      setSubscription(null)
    } catch (error) {
      console.error("Error logging out:", error)
      throw error
    }
  }

  const signup = async (name: string, email: string, password: string) => {
    try {
      const newUser = await createUserAccount({ name, email, password })
      setUser(newUser)

      const userSubscription = await getSubscriptionDetails(newUser.id)
      setSubscription(userSubscription)
    } catch (error) {
      console.error("Error signing up:", error)
      throw error
    }
  }

  const upgrade = async (tier: SubscriptionTier, paymentDetails: any) => {
    if (!user) throw new Error("User not authenticated")

    try {
      const updatedSubscription = await upgradeSubscription(user.id, tier, paymentDetails)
      setSubscription(updatedSubscription)

      // Update user with new subscription tier
      setUser({
        ...user,
        subscription: tier,
      })
    } catch (error) {
      console.error("Error upgrading subscription:", error)
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        login,
        logout,
        signup,
        upgrade,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => useContext(AuthContext)
