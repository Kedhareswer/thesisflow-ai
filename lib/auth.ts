"\"use client"

// This is a mock implementation for demonstration purposes
// In a real application, you would use a proper authentication system

import { createContext, useContext } from "react"

// Types
export type SubscriptionTier = "free" | "basic" | "premium" | "enterprise"

export interface User {
  id: string
  name: string
  email: string
  subscription: SubscriptionTier
  createdAt: string
  updatedAt: string
}

export interface SubscriptionDetails {
  id: string
  userId: string
  tier: SubscriptionTier
  price: number
  startDate: string
  endDate: string | null
  autoRenew: boolean
  status: "active" | "canceled" | "expired"
}

interface AuthContextType {
  user: User | null
  subscription: SubscriptionDetails | null
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  logout: () => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  upgrade: (tier: SubscriptionTier, paymentDetails: any) => Promise<void>
  isLoading: boolean
}

// Create context with default values
export const AuthContext = createContext<AuthContextType>({
  user: null,
  subscription: null,
  login: async () => {},
  logout: async () => {},
  signup: async () => {},
  upgrade: async () => {},
  isLoading: true,
})

// Hook to use auth context
export const useAuth = () => useContext(AuthContext)

// Mock user data for development
const MOCK_USER: User = {
  id: "user_1",
  name: "John Researcher",
  email: "john@example.com",
  subscription: "basic",
  createdAt: "2023-01-15T00:00:00.000Z",
  updatedAt: "2023-04-20T00:00:00.000Z",
}

const MOCK_SUBSCRIPTION: SubscriptionDetails = {
  id: "sub_1",
  userId: "user_1",
  tier: "basic",
  price: 9.99,
  startDate: "2023-04-20T00:00:00.000Z",
  endDate: "2023-05-20T00:00:00.000Z",
  autoRenew: true,
  status: "active",
}

// Mock authentication functions
export async function getCurrentUser(): Promise<User | null> {
  // In a real app, this would check for a token in localStorage/cookies
  // and make an API call to get the current user
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_USER)
    }, 500)
  })
}

export async function getSubscriptionDetails(userId: string): Promise<SubscriptionDetails> {
  // In a real app, this would make an API call to get subscription details
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_SUBSCRIPTION)
    }, 300)
  })
}

export async function loginUser({
  email,
  password,
  rememberMe,
}: {
  email: string
  password: string
  rememberMe?: boolean
}): Promise<User> {
  // In a real app, this would make an API call to authenticate the user
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email && password) {
        resolve({
          ...MOCK_USER,
          email,
        })
      } else {
        reject(new Error("Invalid credentials"))
      }
    }, 1000)
  })
}

export async function logoutUser(): Promise<void> {
  // In a real app, this would clear tokens and make an API call to logout
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, 500)
  })
}

export async function createUserAccount({
  name,
  email,
  password,
}: {
  name: string
  email: string
  password: string
}): Promise<User> {
  // In a real app, this would make an API call to create a new user
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (name && email && password) {
        resolve({
          ...MOCK_USER,
          name,
          email,
        })
      } else {
        reject(new Error("Invalid user data"))
      }
    }, 1000)
  })
}

export async function upgradeSubscription(
  userId: string,
  tier: SubscriptionTier,
  paymentDetails: any,
): Promise<SubscriptionDetails> {
  // In a real app, this would make an API call to upgrade the subscription
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ...MOCK_SUBSCRIPTION,
        tier,
      })
    }, 1000)
  })
}

export async function resetPassword({
  email,
}: {
  email: string
}): Promise<void> {
  // In a real app, this would make an API call to reset the password
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email) {
        resolve()
      } else {
        reject(new Error("Invalid email"))
      }
    }, 1000)
  })
}
