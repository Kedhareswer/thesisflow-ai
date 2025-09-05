"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Search, FileText, Calendar, Users, Bot, Lightbulb, ArrowRight, Menu, Bird } from "lucide-react"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const { user } = useSupabaseAuth()
  const router = useRouter()

  const handleProtectedAction = (href: string) => {
    if (!user) {
      router.push('/login')
      return
    }
    router.push(href)
  }

  const navLinks = [
    { href: "/explorer", label: "Explorer" },
    { href: "/planner", label: "Planner" },
    { href: "/collaborate", label: "Collaborate" },
    { href: "/extract", label: "Extract" }
  ]
  const features = [
    {
      icon: Search,
      title: "Research Explorer",
      description: "Discover papers with AI-powered insights and deep analysis tools."
    },
    {
      icon: FileText,
      title: "Smart Extract",
      description: "Extract and analyze content from documents, PDFs, and research papers."
    },
    {
      icon: Calendar,
      title: "Project Planner",
      description: "Organize research with intelligent task management and timelines."
    }
  ]

  const heroWords = ["Accelerate", "Your", "Research", "with", "AI"]
  
  const featureLabels = ["Literature Review", "Document Analysis", "Project Planning"]


  return (
    <div className="container mx-auto px-4 min-h-screen bg-background font-mono">
      {/* Header */}
      <header className="flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Bird className="h-6 w-6 text-[#FF6B2C]" />
          <span className="font-mono font-bold text-xl">ThesisFlow-AI</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-mono text-sm font-medium hover:text-[#FF6B2C] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-4">
          <Button
            className="rounded-none bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 font-mono"
            onClick={() => handleProtectedAction('/explorer')}
          >
            Start Exploring
          </Button>
        </div>

        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <nav className="flex flex-col space-y-6 mt-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-mono text-lg font-medium hover:text-[#FF6B2C] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Button
                className="rounded-none bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 font-mono mt-6"
                onClick={() => handleProtectedAction('/explorer')}
              >
                Start Exploring
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </header>

      {/* Hero Section */}
      <main className="flex flex-col items-center text-center py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Badge variant="outline" className="mb-8 font-mono">
            Powered by Multiple AI Providers
          </Badge>
        </motion.div>

        {/* Animated Title */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-mono font-bold leading-tight">
            {heroWords.map((word, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.8, 
                  delay: index * 0.1,
                  ease: "easeOut"
                }}
                className="inline-block mr-4"
              >
                {word}
              </motion.span>
            ))}
          </h1>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl font-mono"
        >
          Discover papers, summarize instantly, and plan projects
          <br />
          with an all-in-one AI platform for scholars and professionals.
        </motion.p>

        {/* Feature Labels */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-wrap gap-6 justify-center mb-12 font-mono"
        >
          {featureLabels.map((label, index) => (
            <span key={index} className="text-sm font-medium text-muted-foreground">
              {label}
            </span>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Button
            size="lg"
            className="rounded-none bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 font-mono"
            onClick={() => handleProtectedAction('/explorer')}
          >
            Start Exploring
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="font-mono"
            asChild
          >
            <Link href="/signup">Create Account</Link>
          </Button>
        </motion.div>
      </main>

      {/* Features Section */}
      <section className="py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold font-mono leading-tight mb-4">
            Everything you need for research
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-background border p-8 font-mono"
              >
                <div className="w-12 h-12 bg-[#FF6B2C]/10 rounded-full flex items-center justify-center mb-6">
                  <Icon className="h-6 w-6 text-[#FF6B2C]" />
                </div>
                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
