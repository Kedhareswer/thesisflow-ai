import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
export { metadata } from "./seo/root-metadata"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
// Navbar removed: MainNav no longer used
import { SupabaseAuthProvider } from "@/components/supabase-auth-provider"
import { AuthErrorBoundary } from "@/components/auth-error-boundary"
import { ResearchSessionProvider } from "@/components/research-session-provider"
import { Toaster } from "@/components/ui/toaster"
import { Analytics } from "@vercel/analytics/react"
import { AuthDebug } from "@/components/auth-debug"
import CookieConsent from "@/components/ui/cookies"
import { ClientErrorSuppression } from "@/components/common/ClientErrorSuppression"
import { MobileWarning } from "@/components/mobile-warning"

const inter = Inter({ subsets: ["latin"] })

// metadata is centralized in app/seo/root-metadata.ts and re-exported above

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthErrorBoundary>
            <SupabaseAuthProvider>
              <ResearchSessionProvider>
                <div className="min-h-screen bg-gray-50">
                  {/* Navbar removed */}
                  <main className="flex-1">{children}</main>
                </div>
                <Toaster />
                <AuthDebug />
                <Analytics />
                {/* Global Cookie Consent Banner (new) */}
                <CookieConsent />
                {/* Chrome Extension Error Suppression */}
                <ClientErrorSuppression />
                {/* Mobile Device Warning */}
                <MobileWarning />
              </ResearchSessionProvider>
            </SupabaseAuthProvider>
          </AuthErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}
