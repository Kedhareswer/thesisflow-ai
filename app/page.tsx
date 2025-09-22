"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
// Removed unused Card imports
import { Search, FileText, Calendar, Users, Bot, Lightbulb, ArrowRight, Zap, Clock, Target, MessageSquare, Share2, BarChart3 } from "lucide-react"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { Pricing } from "@/components/ui/pricing-cards"
import { FeaturesSectionWithHoverEffects, type FeatureItem } from "@/components/ui/feature-section-with-hover-effects"
import { motion } from "framer-motion"
import { AccordionComponent } from "@/components/ui/faq-accordion"
import { SoftwareApplication, WebPage } from "@/components/schema/microdata-schema"
// Removed PixelTrail and screen-size hooks in favor of static hero background image
import { Footer } from "@/components/ui/footer"

// metadata moved to app/seo/root-metadata.ts

export default function HomePage() {
  const { user } = useSupabaseAuth()
  const router = useRouter()
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://thesisflow-ai.vercel.app').replace(/\/+$/, '')

  // Consistent button styles across the page
  const glassBtn = "rounded-sm border border-white/40 text-white bg-white/10 hover:bg-white/20 backdrop-blur-md px-6 py-3 text-sm font-medium shadow-lg"
  const glassBtnSoft = "rounded-sm border border-white/30 text-white bg-white/5 hover:bg-white/15 backdrop-blur-md px-6 py-3 text-sm font-medium"
  const primaryBtn = "rounded-sm bg-[#FF6B2C] text-white hover:bg-[#FF6B2C]/90 px-6 py-3 text-sm font-medium shadow-lg"

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
      description: "Find seminal papers fast with multi-source search, ranking, and de-duplication.",
      href: "/explorer",
    },
    {
      icon: FileText,
      title: "Smart Summarizer",
      description: "Turn PDFs into structured abstracts, key claims, and limitations in minutes.",
      href: "/summarizer",
    },
    {
      icon: Calendar,
      title: "Project Planner",
      description: "Plan studies and experiments with AI tasking, timelines, and milestones.",
      href: "/planner",
    },
    {
      icon: Users,
      title: "Collaboration Hub",
      description: "Share context, notes, and drafts without tool-switching or version chaos.",
      href: "/collaborate",
    },
    {
      icon: Bot,
      title: "AI Research Assistant",
      description: "Ask methods and stats questions in plain English—get sourced, checkable answers.",
      href: "/research-assistant",
    },
  ]
  
  // Map existing features to the new hover component input shape
  const hoverFeatures: FeatureItem[] = features.map((f) => {
    const Icon = f.icon
    return {
      title: f.title,
      description: f.description,
      icon: <Icon className="h-7 w-7" />,
    }
  })

  // Benefits content for dark band (mirrors reference, customized for research)
  const benefitItems = [
    {
      icon: MessageSquare,
      title: "Chat-to-Action Command Center",
      description:
        "Tell ThesisFlow what you need—‘Compile related work on diffusion models’—and it kicks off retrieval, deduping, summaries, and a project plan.",
    },
    {
      icon: Zap,
      title: "Instant, Accurate Organization",
      description:
        "We auto‑categorize papers, notes, and citations in real time and learn your taxonomy—so everything stays where you expect it.",
    },
    {
      icon: BarChart3,
      title: "Research Planning That Works",
      description:
        "As your work evolves, timelines and milestones update automatically—clear views of what’s next and what’s at risk.",
    },
    {
      icon: Share2,
      title: "Seamless Advisor & Team Sharing",
      description:
        "Invite co‑authors, advisors, or teammates with one click. Set granular permission levels; keep context without version chaos.",
    },
  ]

  // removed old placeholder benefits (replaced by benefitItems above)

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
      <div style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
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
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
        </div>

        {/* Top navbar overlay */}
        <div className="absolute top-0 left-0 right-0 z-20 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-white">
              <span className="text-xl font-normal">ThesisFlow-AI</span>
            </div>
            <Button 
              variant="outline" 
              className={`${glassBtn} px-5 py-2.5`}
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
                  <h1 
                    className="mb-8"
                    style={{
                      display: 'inline',
                      fontSize: '40px',
                      fontWeight: 300,
                      lineHeight: '44px',
                      color: '#fff'
                    }}
                  >
                    AI Research Sidekick<br />
                    Built for Big Dreamers<br />
                    Who Hate Spreadsheets
                  </h1>
                  <div className="mt-8">
                    <Button
                      className={glassBtn}
                      onClick={() => handleProtectedAction('/explorer')}
                    >
                      Get Started
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right content block */}
              <div className="hidden lg:block lg:col-span-4 lg:col-start-9">
                <p 
                  style={{
                    color: '#fff',
                    fontSize: '14px',
                    lineHeight: '20px',
                    textAlign: 'right'
                  }}
                >
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
            transition={{ duration: 1.2 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 
              className="text-neutral-900"
              style={{
                fontSize: '40px',
                fontWeight: 300,
                letterSpacing: '-0.8px',
                lineHeight: '44px',
                textAlign: 'center'
              }}
            >
              <span className="block">Everything You Need</span>
              <span className="block">for Research.</span>
            </h2>
            <p 
              className="mt-4 max-w-2xl mx-auto"
              style={{
                color: '#0a0a0a',
                fontSize: '14px',
                fontWeight: 300,
                lineHeight: '20px',
                textAlign: 'center'
              }}
            >
              Comprehensive tools designed to streamline every aspect of your research workflow with AI-powered insights.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2 }}
            viewport={{ once: true }}
            className="mt-12 md:mt-14 lg:mt-16"
          >
            <div className="relative max-w-[1040px] mx-auto rounded-[24px] bg-white ring-1 ring-black/5 shadow-[0_32px_64px_-20px_rgba(0,0,0,0.30)] overflow-hidden">              <div className="h-11 bg-gradient-to-b from-neutral-100 to-neutral-50 border-b border-black/10 flex items-center gap-2.5 px-5">
                <span className="inline-block h-[10px] w-[10px] rounded-full bg-[#FF5F57]" />
                <span className="inline-block h-[10px] w-[10px] rounded-full bg-[#FEBC2E]" />
                <span className="inline-block h-[10px] w-[10px] rounded-full bg-[#28C840]" />
              </div>
              <div className="relative aspect-[16/10] bg-white">
                <Image
                  src="/dashboard.png"
                  alt="ThesisFlow research dashboard preview"
                  fill
                  className="object-contain"
                  sizes="(min-width: 1280px) 1024px, (min-width: 768px) 90vw, 100vw"
                  priority={false}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section (Dark) */}
      <section className="relative bg-neutral-950 text-white py-28 md:py-32 lg:py-36">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(255,107,44,0.12),transparent)]" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="text-xs tracking-[0.2em] text-neutral-400 uppercase mb-4">Benefits</div>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight">Built for Researchers, Not Busywork.</h3>
            <p className="mt-4 text-neutral-300 max-w-2xl mx-auto text-lg leading-relaxed">Simple, powerful tools that feel effortless—explore the platform's core capabilities.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {benefitItems.map((b) => {
              const Icon = b.icon
              return (
                <div key={b.title} className="group rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-600 p-6 lg:p-7">
                  <Icon className="h-7 w-7 text-white mb-4" />
                  <div className="text-lg font-medium mb-2">{b.title}</div>
                  <p className="text-sm text-neutral-300 leading-relaxed">{b.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Who We Serve Section - Pixel Perfect Match to Reference */}
      <section className="py-28 md:py-32 lg:py-36 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2 }}
            viewport={{ once: true }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="text-xs tracking-[0.2em] text-neutral-500 uppercase mb-4 font-normal">WHO WE SERVE</div>
            <h3 className="text-4xl sm:text-5xl md:text-6xl font-normal tracking-tight text-neutral-900 leading-[1.1]">
              For Students, Researchers &<br />Growing Teams
            </h3>
            <p className="mt-6 text-neutral-600 text-lg leading-relaxed max-w-2xl mx-auto">
              From solo projects to research groups and labs, ThesisFlow meets you where you are and scales as your ambitions take off.
            </p>
          </motion.div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 - Students */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg hover:shadow-xl transition-all duration-600">
              <div className="relative aspect-[4/3]">
                <Image 
                  src="/students.png" 
                  alt="Students" 
                  fill 
                  className="object-cover transition-transform duration-1000 group-hover:scale-[1.02]" 
                />
                <div className="absolute inset-x-0 bottom-0">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <div className="relative p-6">
                    <div className="text-xs tracking-[0.15em] uppercase text-white/90 mb-3 font-medium">STUDENTS</div>
                    <p className="text-white text-sm leading-relaxed font-normal">Ace your literature reviews, organize notes, and turn messy PDFs into polished summaries.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2 - Independent Researchers */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg hover:shadow-xl transition-all duration-600">
              <div className="relative aspect-[4/3]">
                <Image 
                  src="/researchers.png" 
                  alt="Independent Researchers" 
                  fill 
                  className="object-cover transition-transform duration-1000 group-hover:scale-[1.02]" 
                />
                <div className="absolute inset-x-0 bottom-0">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <div className="relative p-6">
                    <div className="text-xs tracking-[0.15em] uppercase text-white/90 mb-3 font-medium">INDEPENDENT RESEARCHERS</div>
                    <p className="text-white text-sm leading-relaxed font-normal">Build a repeatable workflow—retrieval, deduping, and project planning in one place.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3 - Research Teams & Labs */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-green-100 shadow-lg hover:shadow-xl transition-all duration-600">
              <div className="relative aspect-[4/3]">
                <Image 
                  src="/research_labs.png" 
                  alt="Research Teams & Labs" 
                  fill 
                  className="object-cover transition-transform duration-1000 group-hover:scale-[1.02]" 
                />
                <div className="absolute inset-x-0 bottom-0">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <div className="relative p-6">
                    <div className="text-xs tracking-[0.15em] uppercase text-white/90 mb-3 font-medium">RESEARCH TEAMS & LABS</div>
                    <p className="text-white text-sm leading-relaxed font-normal">Share context, assign tasks, and publish faster with aligned timelines and sources.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Image Band: Doing research is hard enough */}
      <section className="relative min-h-[100vh] overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/research.png" alt="Research band" fill className="object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
        </div>
        <div className="relative z-10 h-full min-h-[100vh] flex items-center">
          <div className="container mx-auto px-6 grid grid-cols-12 items-center">
            <div className="col-span-12 md:col-span-7 lg:col-span-6 text-white">
              <h3 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight leading-tight">
                Doing research
                <br />is hard enough—
                <br />your tooling shouldn’t be.
              </h3>
              <p className="mt-4 text-lg text-white/90 max-w-xl leading-relaxed">
                ThesisFlow handles the tedious parts—deduping, citations, summaries, and now even acts on plain‑language commands—so you can focus on discovery, writing, and breakthroughs.
              </p>
              <div className="mt-8 flex gap-4">
                <Button
                  className={glassBtn}
                  onClick={(e) => { e.preventDefault?.(); handleProtectedAction('/explorer') }}
                >
                  Try the Explorer
                </Button>
                <Button
                  variant="outline"
                  className={glassBtnSoft}
                  onClick={(e) => { e.preventDefault?.(); handleProtectedAction('/planner') }}
                >
                  See the Planner
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Testimonials Section removed for Future Use */}

      {/* Pricing Section */}
      <motion.div 
        id="pricing"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2 }}
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
            transition={{ duration: 1.2 }}
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
      </div>
    </SoftwareApplication>
  )
}
