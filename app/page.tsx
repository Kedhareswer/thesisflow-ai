"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, FileText, Calendar, Users, Bot, Lightbulb, ArrowRight, Zap, Shield, Globe, Clock, Target } from "lucide-react"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { Pricing } from "@/components/ui/pricing-cards"
import { FeaturesSectionWithHoverEffects, type FeatureItem } from "@/components/ui/feature-section-with-hover-effects"
import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1"

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

  // Testimonials data
  const testimonials = [
    {
      text:
        "This ERP revolutionized our operations, streamlining finance and inventory. The cloud-based platform keeps us productive, even remotely.",
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop",
      name: "Briana Patton",
      role: "Operations Manager",
    },
    {
      text:
        "Implementing this ERP was smooth and quick. The customizable, user-friendly interface made team training effortless.",
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop",
      name: "Bilal Ahmed",
      role: "IT Manager",
    },
    {
      text:
        "The support team is exceptional, guiding us through setup and providing ongoing assistance, ensuring our satisfaction.",
      image: "https://images.unsplash.com/photo-1544005311-94ddf0286df2?q=80&w=200&auto=format&fit=crop",
      name: "Saman Malik",
      role: "Customer Support Lead",
    },
    {
      text:
        "This ERP's seamless integration enhanced our business operations and efficiency. Highly recommend for its intuitive interface.",
      image: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?q=80&w=200&auto=format&fit=crop",
      name: "Omar Raza",
      role: "CEO",
    },
    {
      text:
        "Its robust features and quick support have transformed our workflow, making us significantly more efficient.",
      image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=200&auto=format&fit=crop",
      name: "Zainab Hussain",
      role: "Project Manager",
    },
    {
      text:
        "The smooth implementation exceeded expectations. It streamlined processes, improving overall business performance.",
      image: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop",
      name: "Aliza Khan",
      role: "Business Analyst",
    },
    {
      text:
        "Our business functions improved with a user-friendly design and positive customer feedback.",
      image: "https://images.unsplash.com/photo-1541534401786-2077eed87a72?q=80&w=200&auto=format&fit=crop",
      name: "Farhan Siddiqui",
      role: "Marketing Director",
    },
    {
      text:
        "They delivered a solution that exceeded expectations, understanding our needs and enhancing our operations.",
      image: "https://images.unsplash.com/photo-1544005316-04ce1f1a65a2?q=80&w=200&auto=format&fit=crop",
      name: "Sana Sheikh",
      role: "Sales Manager",
    },
    {
      text:
        "Using this ERP, our online presence and conversions significantly improved, boosting business performance.",
      image: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=200&auto=format&fit=crop",
      name: "Hassan Ali",
      role: "E-commerce Manager",
    },
  ]

  const firstColumn = testimonials.slice(0, 3)
  const secondColumn = testimonials.slice(3, 6)
  const thirdColumn = testimonials.slice(6, 9)

  // Map existing features to the new hover component input shape
  const hoverFeatures: FeatureItem[] = features.map((f) => {
    const Icon = f.icon
    return {
      title: f.title,
      description: f.description,
      icon: <Icon className="h-6 w-6" />,
    }
  })

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

      {/* Features Grid — redesigned with hover effects */}
      <section className="section-spacing bg-muted/30">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="text-headline mb-4">Everything you need for research</h2>
            <p className="text-body text-muted-foreground">
              Comprehensive tools designed to streamline every aspect of your research workflow.
            </p>
          </div>
          <FeaturesSectionWithHoverEffects features={hoverFeatures} />
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

      {/* Testimonials Section (above Pricing) */}
      <section className="bg-background my-20 relative">
        <div className="container z-10 mx-auto">
          <div className="flex flex-col items-center justify-center max-w-[540px] mx-auto">
            <div className="flex justify-center">
              <div className="border py-1 px-4 rounded-lg">Testimonials</div>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tighter mt-5">
              What our users say
            </h2>
            <p className="text-center mt-5 opacity-75">See what our customers have to say about us.</p>
          </div>

          <div className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
            <TestimonialsColumn testimonials={firstColumn} duration={15} />
            <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
            <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
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
