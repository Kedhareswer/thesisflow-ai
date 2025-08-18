"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, FileText, Calendar, Users, Bot, Lightbulb, ArrowRight, Zap, Shield, Globe, Clock, Target } from "lucide-react"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import DisplayCards from "@/components/ui/display-cards"
import { Pricing } from "@/components/ui/pricing-cards"

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
  const features = [
    {
      icon: Search,
      title: "Research Explorer",
      description: "Discover and analyze research papers with AI-powered insights and recommendations.",
      href: "/explorer",
    },
    {
      icon: FileText,
      title: "Smart Summarizer",
      description: "Generate comprehensive summaries from papers, documents, and web content.",
      href: "/summarizer",
    },
    {
      icon: Calendar,
      title: "Project Planner",
      description: "Organize research projects with intelligent task management and timelines.",
      href: "/planner",
    },
    {
      icon: Lightbulb,
      title: "AI Tools",
      description: "Access powerful AI-powered research tools and utilities for analysis.",
      href: "/ai-tools",
    },
    {
      icon: Users,
      title: "Collaboration Hub",
      description: "Work together with real-time chat, shared workspaces, and team management.",
      href: "/collaborate",
    },
    {
      icon: Bot,
      title: "AI Research Assistant",
      description: "Get expert guidance on methodology, analysis, and research best practices.",
      href: "/research-assistant",
    },
  ]

  const benefits = [
    {
      icon: Zap,
      title: "Accelerated Research",
      description: "Reduce research time by 60% with AI-powered tools and automation.",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-grade security with encrypted data and secure API handling.",
    },
    {
      icon: Globe,
      title: "Global Collaboration",
      description: "Connect with researchers worldwide through real-time collaboration tools.",
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="section-spacing">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center content-spacing">
            <Badge variant="outline" className="mb-6">
              Powered by Multiple AI Providers
            </Badge>

            <h1 className="text-display text-balance mb-6">
              Accelerate Your Research with AI
            </h1>

            <p className="text-xl text-muted-foreground text-balance mb-8 max-w-2xl mx-auto leading-relaxed">
              Discover papers, summarize instantly, and plan projects with an all-in-one AI platform for scholars and professionals.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="focus-ring"
                onClick={() => handleProtectedAction('/explorer')}
              >
                  Start Exploring
                  <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" asChild className="focus-ring">
                <Link href="/signup">Create Account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="section-spacing bg-muted/30">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="text-headline mb-4">Everything you need for research</h2>
            <p className="text-body text-muted-foreground">
              Comprehensive tools designed to streamline every aspect of your research workflow.
            </p>
          </div>

          <div className="grid grid-auto-fit gap-8">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className="group hover:shadow-lg transition-all duration-300 border-0 shadow-sm animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-accent rounded-lg group-hover:bg-foreground group-hover:text-background transition-colors">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-title">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-body mb-4">{feature.description}</CardDescription>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-0 h-auto font-normal"
                    onClick={() => handleProtectedAction(feature.href)}
                  >
                    <span className="inline-flex items-center text-sm">
                      Learn more
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </span>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Research Challenges Section */}
      <section className="py-16 bg-white dark:bg-background">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Research Shouldn't Be This Hard
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Academic researchers waste 40% of their time on administrative tasks and tool-switching instead of actual research.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-background p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-gray-900 dark:text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Time Wasted</h3>
              <p className="text-gray-600 dark:text-gray-300">Switching between 8+ different tools for literature review, writing, and collaboration.</p>
            </div>
            
            <div className="bg-background p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-6 h-6 text-gray-900 dark:text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Lost Focus</h3>
              <p className="text-gray-600 dark:text-gray-300">Constant context switching breaks deep work and reduces research quality.</p>
            </div>
            
            <div className="bg-background p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-gray-900 dark:text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Team Chaos</h3>
              <p className="text-gray-600 dark:text-gray-300">Fragmented communication and version control nightmares slow collaboration.</p>
            </div>
          </div>

          <div className="text-center">
            <Button className="bg-black hover:bg-gray-800 text-white px-8 py-4 rounded-lg transition-all transform hover:scale-105 font-semibold text-base shadow-lg">
              Solve This Now
              <ArrowRight className="w-5 h-5 inline ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section-spacing">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="text-headline mb-4">Why choose our platform</h2>
            <p className="text-body text-muted-foreground">
              Built with modern technology and research best practices in mind.
            </p>
          </div>

          <div className="flex min-h-[350px] w-full items-center justify-center">
            <div className="w-full max-w-2xl">
              <DisplayCards 
                cards={[
                  {
                    icon: <Zap className="size-4 text-blue-300" />,
                    title: "Accelerated Research",
                    description: "Reduce research time by 60% with AI-powered tools and automation.",
                    iconClassName: "text-blue-500",
                    titleClassName: "text-blue-500",
                    className:
                      "[grid-area:stack] hover:-translate-y-8 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
                  },
                  {
                    icon: <Shield className="size-4 text-blue-300" />,
                    title: "Enterprise Security",
                    description: "Bank-grade security with encrypted data and secure API handling.",
                    iconClassName: "text-blue-500",
                    titleClassName: "text-blue-500",
                    className:
                      "[grid-area:stack] translate-x-12 translate-y-8 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
                  },
                  {
                    icon: <Globe className="size-4 text-blue-300" />,
                    title: "Global Collaboration",
                    description: "Connect with researchers worldwide through real-time collaboration tools.",
                    iconClassName: "text-blue-500",
                    titleClassName: "text-blue-500",
                    className:
                      "[grid-area:stack] translate-x-24 translate-y-16 hover:translate-y-8",
                  },
                ]} 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <Pricing />

      {/* CTA Section */}
      <section className="section-spacing bg-foreground text-background">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center content-spacing">
            <h2 className="text-headline mb-4">Ready to accelerate your research?</h2>
            <p className="text-body opacity-90 mb-8">
              Join thousands of researchers already using our platform to advance their work.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild className="focus-ring">
                <Link href="/signup">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-background/20 text-black hover:bg-background/10 focus-ring"
                onClick={() => handleProtectedAction('/explorer')}
              >
                View Demo
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
