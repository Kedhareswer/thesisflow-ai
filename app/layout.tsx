import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { MainNav } from "@/components/main-nav"
import { SupabaseAuthProvider } from "@/components/supabase-auth-provider"
import { Toaster } from "@/components/ui/toaster"
import { Analytics } from "@vercel/analytics/react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Research Hub - AI-Powered Research Platform",
  description: "Generate, organize, and develop your research ideas with AI assistance and collaborative tools.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <SupabaseAuthProvider>
            <div className="min-h-screen bg-gray-50">
              <MainNav />
              <main className="flex-1">{children}</main>
            </div>
            <Toaster />
            <Analytics />
          </SupabaseAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
