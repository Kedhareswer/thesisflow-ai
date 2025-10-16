"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Home, 
  Search, 
  ArrowLeft, 
  BookOpen, 
  FileText, 
  Lightbulb,
  TrendingUp,
  HelpCircle,
  Compass
} from "lucide-react"

export default function NotFound() {
  const [searchQuery, setSearchQuery] = useState("")
  const [countdown, setCountdown] = useState(10)

  // Countdown timer for auto-redirect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          window.location.href = "/"
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/explorer?q=${encodeURIComponent(searchQuery)}`
    }
  }

  const popularPages = [
    { name: "Research Assistant", href: "/explorer", icon: Compass, description: "AI-powered research help" },
    { name: "Literature Search", href: "/literature-review", icon: BookOpen, description: "Find academic papers" },
    { name: "Writing Assistant", href: "/writer", icon: FileText, description: "Improve your writing" },
    { name: "Topic Explorer", href: "/topics", icon: Lightbulb, description: "Discover research topics" },
  ]

  const helpfulLinks = [
    { name: "Home", href: "/", icon: Home },
    { name: "Documentation", href: "/docs", icon: BookOpen },
    { name: "Pricing", href: "/pricing", icon: TrendingUp },
    { name: "Support", href: "/contact", icon: HelpCircle },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Main 404 Content */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-6">
            <span className="text-destructive">404 Error</span>
          </Badge>
          
          {/* Animated 404 */}
          <div className="relative mb-8">
            <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-pink-500 animate-pulse">
              404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-primary/10 animate-ping" />
            </div>
          </div>

          <h2 className="text-4xl font-bold mb-4">Page Not Found</h2>
          <p className="text-xl text-muted-foreground mb-2 max-w-2xl mx-auto">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Redirecting to home in <span className="font-mono font-bold text-primary">{countdown}</span> seconds...
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-md mx-auto mb-12">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search for topics, papers, or help..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Search</Button>
            </div>
          </form>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-12">
            <Button asChild size="lg" className="gap-2">
              <Link href="/">
                <Home className="w-4 h-4" />
                Go Home
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link href="#" onClick={() => window.history.back()}>
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </Link>
            </Button>
          </div>
        </div>

        {/* Popular Pages */}
        <div className="mb-12">
          <h3 className="text-2xl font-semibold text-center mb-6">Popular Pages</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {popularPages.map((page) => (
              <Link key={page.href} href={page.href}>
                <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <page.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{page.name}</h4>
                        <p className="text-sm text-muted-foreground">{page.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Helpful Links */}
        <div className="border-t pt-8">
          <h3 className="text-lg font-semibold text-center mb-6">Helpful Links</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            {helpfulLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button variant="ghost" className="gap-2">
                  <link.icon className="w-4 h-4" />
                  {link.name}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div className="text-center mt-12 p-6 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground mb-2">
            Still can't find what you're looking for?
          </p>
          <Button asChild variant="link">
            <Link href="/contact">Contact Support →</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
