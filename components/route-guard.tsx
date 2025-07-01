"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface RouteGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireAdmin?: boolean
  fallback?: React.ReactNode
}

// Protected routes configuration
const PROTECTED_ROUTES = [
  "/explorer",
  "/summarizer", 
  "/research-assistant",
  "/collaborate", 
  "/collaboration",
  "/planner",
  "/writing-assistant",
  "/ai-assistant",
  "/profile",
  "/settings"
]

const ADMIN_ROUTES = ["/admin"]

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password", 
  "/reset-password",
  "/unauthorized"
]

export function RouteGuard({ 
  children, 
  requireAuth = false, 
  requireAdmin = false,
  fallback 
}: RouteGuardProps) {
  const { user, isLoading } = useSupabaseAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  // Determine if current route requires protection (must be calculated before any early returns)
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route))
  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route))
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route))

  // Check authentication requirements (must be calculated before any early returns)
  const needsAuth = requireAuth || isProtectedRoute || isAdminRoute
  const needsAdmin = requireAdmin || isAdminRoute

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect logic - this useEffect must always be called regardless of conditions
  useEffect(() => {
    if (mounted && !isLoading) {
      // Redirect unauthenticated users from protected routes
      if (needsAuth && !user) {
        const redirectUrl = `/login?redirectTo=${encodeURIComponent(pathname)}`
        router.push(redirectUrl)
        return
      }

      // Redirect authenticated users from auth pages
      if (user && (pathname === "/login" || pathname === "/signup")) {
        const urlParams = new URLSearchParams(window.location.search)
        const redirectTo = urlParams.get("redirectTo") || "/explorer"
        router.push(redirectTo)
        return
      }
    }
  }, [user, isLoading, mounted, needsAuth, pathname, router])

  // NOW we can do early returns after all hooks have been called
  
  // Don't render anything until mounted (prevents hydration mismatch)
  if (!mounted) {
    return <LoadingSpinner text="Loading..." />
  }

  // Show loading while auth is being determined
  if (isLoading) {
    return fallback || <LoadingSpinner text="Authenticating..." />
  }

  // Render unauthorized page for admin routes
  if (needsAdmin && user && !checkIsAdmin(user)) {
    return <UnauthorizedPage />
  }

  // Don't render children if redirecting
  if (needsAuth && !user) {
    return fallback || <LoadingSpinner text="Redirecting to login..." />
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    return fallback || <LoadingSpinner text="Redirecting..." />
  }

  return <>{children}</>
}

// Helper function to check admin role
function checkIsAdmin(user: any): boolean {
  // This would typically check user.role or user.user_metadata.role
  // For now, we'll use a simple check - you can enhance this based on your user model
  return user?.user_metadata?.role === "admin" || user?.role === "admin"
}

// Unauthorized page component
function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-900">Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm">You don't have permission to access this page</p>
          </div>
          <p className="text-gray-600 text-sm">
            This page requires administrator privileges. Please contact your system administrator if you believe this is an error.
          </p>
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/explorer">Go to Explorer</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/profile">View Profile</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// HOC for easy route protection
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: { requireAdmin?: boolean } = {}
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <RouteGuard requireAuth={true} requireAdmin={options.requireAdmin}>
        <Component {...props} />
      </RouteGuard>
    )
  }
}

// Hook for checking auth status in components
export function useAuthGuard() {
  const { user, isLoading } = useSupabaseAuth()
  const pathname = usePathname()

  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route))
  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route))
  const isAuthenticated = !!user
  const isUserAdmin = user ? checkIsAdmin(user) : false

  return {
    user,
    isLoading,
    isAuthenticated,
    isAdmin: isUserAdmin,
    isProtectedRoute,
    isAdminRoute,
    canAccess: isProtectedRoute ? isAuthenticated : true,
    canAccessAdmin: isAdminRoute ? isAuthenticated && isUserAdmin : true
  }
}
