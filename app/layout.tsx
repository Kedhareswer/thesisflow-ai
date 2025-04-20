import type React from "react"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { SocketProvider } from "@/components/socket-provider"
import { SupabaseAuthProvider } from "@/components/supabase-auth-provider"
import { UserProvider } from "@/components/user-provider"
import MainNav from "@/components/main-nav"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Research Collaboration Platform",
  description: "A platform for collaborative research with AI-powered tools",
  generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <SupabaseAuthProvider>
            <UserProvider>
              <SocketProvider>
                <div className="min-h-screen flex flex-col">
                  <MainNav />
                  <main className="flex-1 container mx-auto py-6 px-4">{children}</main>
                </div>
                <Toaster />
              </SocketProvider>
            </UserProvider>
          </SupabaseAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
