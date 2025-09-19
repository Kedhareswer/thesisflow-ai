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
      {/* Hero Section - exact match to reference image */}
      <main className="relative min-h-[100vh] overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/hero.png"
            alt="Hero background"
            fill
            priority
            className="object-cover object-center"
          />
        </div>

        {/* Top navbar overlay */}
        <div className="absolute top-0 left-0 right-0 z-20 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-white">
              <span className="text-xl font-normal">ThesisFlow-AI</span>
            </div>
            <Button 
              variant="outline" 
              className="rounded-sm border-white/40 text-white hover:bg-white/20 backdrop-blur-md bg-white/15 px-6 py-2 text-sm font-normal shadow-lg"
              onClick={() => handleProtectedAction('/explorer')}
            >
              Get Started
            </Button>
          </div>
        </div>

        {/* Content overlay */}
        <div className="relative z-10 h-full min-h-[100vh] flex items-center">
          <div className="w-full px-8">
            <div className="grid grid-cols-12 gap-8 items-center">
              {/* Left content block */}
              <div className="col-span-12 lg:col-span-6 text-white">
                <div className="mb-4">
                  <div className="text-xs font-normal tracking-[0.15em] uppercase text-white/90 mb-6">
                    COMING SOON
                  </div>
                  <h1 className="text-5xl lg:text-6xl xl:text-7xl font-normal leading-[1.1] mb-8">
                    AI Research Sidekick<br />
                    Built for Big Dreamers<br />
                    Who Hate Spreadsheets
                  </h1>
                  <div className="mt-8">
                    <Button
                      className="rounded-sm bg-white/20 backdrop-blur-md border border-white/40 text-white hover:bg-white/30 px-6 py-3 text-sm font-normal shadow-lg"
                      onClick={() => handleProtectedAction('/explorer')}
                    >
                      Get Started
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right content block */}
              <div className="hidden lg:block lg:col-span-4 lg:col-start-9 text-white/90">
                <p className="text-sm font-normal leading-relaxed">
                  We're putting the finishing touches on a tool that automates your research, teaches you as you go, and gives you daily insights that actually help you run your research better.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Light Showcase Section - 'Everything You Need for Research' */}
      <section className="relative isolate bg-[#F7F6F3] py-28 md:py-32 lg:py-36">
        <div aria-hidden className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_60%_at_50%_40%,black,transparent)] bg-black/5"></div>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-neutral-900 tracking-tight font-medium leading-tight text-4xl sm:text-5xl md:text-6xl">
              <span className="block">Everything You Need</span>
              <span className="block">for Research.</span>
            </h2>
            <p className="mt-4 text-neutral-600 text-lg sm:text-xl md:text-[20px] leading-relaxed max-w-2xl mx-auto">
              Comprehensive tools designed to streamline every aspect of your research workflow with AI-powered insights.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="mt-16 lg:mt-20"
          >
            <div className="relative max-w-5xl mx-auto rounded-[24px] bg-white ring-1 ring-black/10 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.35)] overflow-hidden">
              <div className="h-12 bg-gradient-to-b from-neutral-100 to-neutral-50 border-b border-black/10 flex items-center gap-2 px-4">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#28C840]" />
              </div>
              <div className="relative aspect-[16/10] bg-white">
                <Image
                  src="/screenshots/research-dashboard-mock.svg"
                  alt="ThesisFlow research dashboard preview"
                  fill
                  className="object-cover"
                  sizes="(min-width: 1280px) 1024px, (min-width: 768px) 90vw, 100vw"
                  priority={false}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Dark Features Section */}
      <section className="relative bg-neutral-950 text-white py-28 md:py-32 lg:py-36">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(255,107,44,0.15),transparent)]" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight">Built for Researchers, Not Busywork.</h3>
            <p className="mt-4 text-neutral-300 max-w-2xl mx-auto text-lg leading-relaxed">Simple, powerful tools that feel effortless—explore the platform's core capabilities.</p>
          </motion.div>
          {/* Enable dark: styles within the grid */}
          <div className="dark">
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
      
      </WebPage>
    </SoftwareApplication>
  )
}
