"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
// Removed unused Card imports
import { Badge } from "@/components/ui/badge"
import { Search, FileText, Calendar, Users, Bot, Lightbulb, ArrowRight, Zap, Shield, Globe, Clock, Target } from "lucide-react"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { Pricing } from "@/components/ui/pricing-cards"
import { FeaturesSectionWithHoverEffects, type FeatureItem } from "@/components/ui/feature-section-with-hover-effects"
import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1"
import { motion } from "framer-motion"
import { AccordionComponent } from "@/components/ui/faq-accordion"
import { SoftwareApplication, WebPage } from "@/components/schema/microdata-schema"
// Removed PixelTrail and screen-size hooks in favor of static hero background image
import { HomeLoader } from "@/components/ui/home-loader"
import { Footer } from "@/components/ui/footer"

// metadata moved to app/seo/root-metadata.ts

export default function HomePage() {
  const { user } = useSupabaseAuth()
  const router = useRouter()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thesisflow-ai.vercel.app'

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

  // Testimonials data (updated for ThesisFlow-AI)
  const testimonials = [
    {
      text:
        "Deep Research helped me synthesize a complete literature review in a single day. The multi-source search and deduplication are spot on.",
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop",
      name: "Dr. Elena Ruiz",
      role: "Assistant Professor",
    },
    {
      text:
        "Smart Summarizer creates structured abstracts, key claims, and limitations from PDFs in minutes—perfect for paper triage.",
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop",
      name: "Marcus Lee",
      role: "PhD Candidate",
    },
    {
      text:
        "The Project Planner keeps experiments, tasks, and due dates together. No more juggling spreadsheets and sticky notes.",
      image: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?q=80&w=200&auto=format&fit=crop",
      name: "Priya Nair",
      role: "Research Manager",
    },
    {
      text:
        "Collaboration Hub replaced my chat + docs combo. Inline citations and previews keep everyone aligned without context switching.",
      image: "https://images.unsplash.com/photo-1544005311-94ddf0286df2?q=80&w=200&auto=format&fit=crop",
      name: "Ahmed Karim",
      role: "Lab Coordinator",
    },
    {
      text:
        "AI Research Assistant explains methods and statistics in plain language—and links to sources so I can verify quickly.",
      image: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop",
      name: "Sara Novak",
      role: "Data Scientist",
    },
    {
      text:
        "Explorer with aggregation surfaced seminal papers I would've missed. Great balance of recall and precision.",
      image: "https://images.unsplash.com/photo-1541534401786-2077eed87a72?q=80&w=200&auto=format&fit=crop",
      name: "Tomás García",
      role: "Postdoctoral Fellow",
    },
    {
      text:
        "Setup took minutes—imported PDFs and got clean summaries with one click. The UI is fast and intuitive.",
      image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=200&auto=format&fit=crop",
      name: "Jia Chen",
      role: "Graduate Researcher",
    },
    {
      text:
        "Security and reliability give me confidence to use it for grant and manuscript work.",
      image: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=200&auto=format&fit=crop",
      name: "Rachel Moore",
      role: "Principal Investigator",
    },
    {
      text:
        "ThesisFlow-AI removes tool fatigue—search, summarize, plan, and collaborate without leaving the page.",
      image: "https://images.unsplash.com/photo-1544005316-04ce1f1a65a2?q=80&w=200&auto=format&fit=crop",
      name: "Leo Martins",
      role: "Engineer, R&D",
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
    <SoftwareApplication
      name="ThesisFlow-AI"
      description="Accelerate your research with AI-powered tools for discovering papers, summarizing content, and planning projects. All-in-one platform for scholars and professionals."
      applicationCategory="EducationalApplication"
      operatingSystem="Web Browser"
      url={baseUrl}
      author={{
        name: "ThesisFlow-AI",
        type: "Organization"
      }}
      datePublished="2024-01-01"
      dateModified={new Date().toISOString().split('T')[0]}
      aggregateRating={{
        ratingValue: 4.8,
        bestRating: 5,
        ratingCount: 150
      }}
      offers={{
        price: "0",
        priceCurrency: "USD", 
        availability: "InStock"
      }}
    >
      <WebPage
        name="ThesisFlow-AI - AI-Powered Research Platform"
        description="Discover papers, summarize instantly, and plan projects with an all-in-one AI platform for scholars and professionals."
        url={baseUrl}
        dateModified={new Date().toISOString().split('T')[0]}
        author={{
          name: "ThesisFlow-AI",
          type: "Organization"
        }}
        breadcrumb={[
          { name: "Home", url: baseUrl }
        ]}
      >
        <HomeLoader text="Thesis Flow" bgColor="#fe7a41" showMs={5000} fadeDurationMs={700} />
        <div className="container mx-auto px-4 min-h-screen">
      {/* Hero Section - background image with left and right content like the reference */}
      <main className="relative min-h-[680px] md:min-h-[740px] lg:min-h-[780px] overflow-hidden">
        {/* Top overlay header */}
        <div className="absolute top-0 left-0 right-0 z-20 py-4">
          <div className="container mx-auto px-6 flex items-center justify-between text-white">
            <span className="text-lg font-semibold">ThesisFlow-AI</span>
            <Button variant="outline" className="rounded-none border-white text-white hover:bg-white/10">
              Join Waitlist
            </Button>
          </div>
        </div>
        {/* Background image */}
        <div className="absolute inset-0 -z-10">
          <Image
            src="public\hero.png"
            alt="Hero background"
            fill
            priority
            className="object-cover object-center"
          />
          {/* Dark-to-transparent gradient for left text legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
        </div>

        {/* Content overlay */}
        <div className="relative z-10 h-full">
          <div className="container mx-auto px-6 h-full grid grid-cols-12 items-center gap-6">
            {/* Left block */}
            <div className="col-span-12 md:col-span-7 lg:col-span-6 text-left text-white">
              <div className="mb-6 text-[10px] md:text-xs tracking-[0.2em] uppercase text-white/80">
                Coming Soon
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
                AI Accounting Sidekick
                <br />
                <span className="text-white/90">Built for Big Dreamers</span>
                <br />
                <span className="text-white/90">Who Hate Spreadsheets</span>
              </h1>
              <div className="mt-8">
                <Button
                  size="lg"
                  className="rounded-none bg-white text-black hover:bg-white/90 shadow-md"
                >
                  Join Waitlist
                </Button>
              </div>
            </div>

            {/* Right block */}
            <div className="hidden md:block md:col-span-4 lg:col-span-3 md:ml-auto text-white/85 text-sm leading-relaxed">
              We’re putting the finishing touches on a tool that automates your accounting, teaches you as you go, and gives you daily insights that actually help you run your business better.
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl font-bold mb-6 text-foreground tracking-tight">Everything You Need for Research</h2>
            <p className="text-2xl text-muted-foreground font-normal leading-relaxed max-w-4xl mx-auto">
              Comprehensive tools designed to streamline every aspect of your research workflow with AI-powered insights.
            </p>
          </motion.div>
          {/* Feature grid with hover effects (single source of truth) */}
          <div className="mt-12">
            <FeaturesSectionWithHoverEffects features={hoverFeatures} />
          </div>
        </div>
      </section>

      {/* Research Challenges Section */}
      <section className="py-32 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl font-bold text-foreground mb-8 tracking-tight">
              Research Shouldn't Be This Hard
            </h2>
            <p className="text-2xl text-muted-foreground font-normal max-w-4xl mx-auto leading-relaxed">
              Academic researchers waste 40% of their time on administrative tasks and tool-switching instead of actual research.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-background border p-8"
            >
              <div className="w-12 h-12 bg-[#FF6B2C]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-[#FF6B2C]" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Time Wasted</h3>
              <p className="text-muted-foreground font-medium leading-relaxed">Switching between 8+ different tools for literature review, writing, and collaboration.</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-background border p-8"
            >
              <div className="w-12 h-12 bg-[#FF6B2C]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-6 h-6 text-[#FF6B2C]" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Lost Focus</h3>
              <p className="text-muted-foreground font-medium leading-relaxed">Constant context switching breaks deep work and reduces research quality.</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-background border p-8"
            >
              <div className="w-12 h-12 bg-[#FF6B2C]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-[#FF6B2C]" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Team Chaos</h3>
              <p className="text-muted-foreground font-medium leading-relaxed">Fragmented communication and version control nightmares slow collaboration.</p>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Button 
              className="rounded-none bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 font-medium px-8 py-4 text-base shadow-lg"
              onClick={() => handleProtectedAction('/explorer')}
            >
              Solve This Now
              <ArrowRight className="w-5 h-5 inline ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-background py-32 relative">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex text-center justify-center items-center gap-6 flex-col mb-20"
          >
            <Badge className="font-medium text-lg px-4 py-2">Testimonials</Badge>
            <div className="flex gap-4 flex-col">
              <h2 className="text-5xl font-bold text-foreground max-w-2xl text-center tracking-tight">
                What our users say
              </h2>
              <p className="text-2xl leading-relaxed font-normal text-muted-foreground max-w-2xl text-center">
                See what our customers have to say about us.
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
            className="flex justify-center gap-6 mt-12 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden"
          >
            <TestimonialsColumn testimonials={firstColumn} duration={15} />
            <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
            <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <motion.div 
        id="pricing"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <Pricing />
      </motion.div>

      {/* FAQ Section */}
      <section id="faq" className="py-32 bg-background">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold text-foreground mb-6 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-2xl text-muted-foreground font-normal leading-relaxed max-w-3xl mx-auto">
              Answers to common questions about ThesisFlow-AI.
            </p>
          </motion.div>
          <AccordionComponent />
        </div>
      </section>
      {/* Footer */}
      <Footer />
      
        </div>
      </WebPage>
    </SoftwareApplication>
  )
}
