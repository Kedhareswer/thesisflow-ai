"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
// Removed unused Card imports
import { Search, FileText, Calendar, Users, Bot, Lightbulb, ArrowRight, Zap, Clock, Target, MessageSquare, Share2, BarChart3, ExternalLink } from "lucide-react"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { Pricing } from "@/components/ui/pricing-cards"
import { FeaturesSectionWithHoverEffects, type FeatureItem } from "@/components/ui/feature-section-with-hover-effects"
import { motion } from "framer-motion"
import { AccordionComponent } from "@/components/ui/faq-accordion"
import { SoftwareApplication, WebPage } from "@/components/schema/microdata-schema"
// Removed PixelTrail and screen-size hooks in favor of static hero background image
import { Footer } from "@/components/ui/footer"
import { ResearchHeroWithCards } from "@/components/ui/research-hero-with-cards"
import StatsCarouselCount from "@/src/components/ui/statscarousel"

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

  // Benefits content for dark band (customized for ThesisFlow-AI)
  const benefitItems = [
    {
      icon: Search,
      title: "Multi‑Source Research Discovery",
      description:
        "Search OpenAlex, arXiv, CrossRef and more—rank, dedupe and bookmark the right papers fast.",
    },
    {
      icon: FileText,
      title: "One‑Click Summaries & Tables",
      description:
        "Extract structured insights—abstracts, key claims, tables, and entities—from PDFs, DOCX, PPT and images (OCR).",
    },
    {
      icon: Calendar,
      title: "Plans that Stay in Sync",
      description:
        "Tasks, Gantt, and milestones auto‑update as your work evolves—stay clear on what's next.",
    },
    {
      icon: Users,
      title: "Seamless Collaboration",
      description:
        "Share context, assign tasks, and get advisor feedback—without version chaos.",
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
      <main className="relative min-h-[102vh] overflow-hidden z-0">
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
        <div className="absolute top-0 left-0 right-0 z-20 px-4 sm:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-white">
              <span className="text-lg sm:text-xl font-normal">ThesisFlow-AI</span>
            </div>
            <Button 
              variant="outline" 
              className={`${glassBtn} px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm`}
              onClick={() => handleProtectedAction('/explorer')}
            >
              Get Started
            </Button>
          </div>
        </div>

        {/* Content overlay */}
        <div className="relative z-10 h-full min-h-[100vh] flex items-center">
          <div className="w-full px-4 sm:px-8">
            <div className="grid grid-cols-12 gap-4 sm:gap-8 items-center">
              {/* Left content block */}
              <div className="col-span-12 lg:col-span-6 text-white">
                <div className="mb-4">
                  <div className="text-xs font-normal tracking-[0.15em] uppercase text-white/90 mb-4 sm:mb-6">
                   Turn Research Chaos into Clarity with AI
                  </div>
                  <h1 
                    className="mb-6 sm:mb-8 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light leading-tight"
                    style={{
                      color: '#fff'
                    }}
                  >
                    AI Research Sidekick<br />
                    Built for Big Dreamers,<br />
                    Smarter, Faster, Stress-Free
                  </h1>
                  <div className="mt-6 sm:mt-8">
                    <Button
                      className={`${glassBtn} w-full sm:w-auto`}
                      onClick={() => handleProtectedAction('/explorer')}
                    >
                      Get Started
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right content block */}
              <div className="hidden md:block md:col-span-12 lg:col-span-4 lg:col-start-9 mt-8 lg:mt-0">
                <div className="text-center lg:text-right mb-4">
                  <Link 
                    href="/changelog"
                    className="group inline-flex items-center gap-2 text-white/80 hover:text-white transition-all duration-300 text-sm"
                  >
                    <span className="relative">
                      changelog
                      <span className="absolute bottom-0 left-0 w-0 h-px bg-white transition-all duration-300 group-hover:w-full"></span>
                    </span>
                    <ExternalLink className="h-3 w-3 opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
                  </Link>
                </div>
                <p className="text-white text-sm leading-relaxed text-center lg:text-right">
                  We're putting the finishing touches on a tool that automates your research, teaches you as you go, and gives you daily insights that actually help you run your research better.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Research Hero with Stacking Cards */}
      <div className="z-1">
        <ResearchHeroWithCards text="RESEARCH" />
      </div>

      {/* Stats Carousel Section */}
      <section className="relative bg-white py-16 sm:py-20 md:py-24 lg:py-28 z-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2 }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <StatsCarouselCount
              title="POWER YOUR RESEARCH WITH THESISFLOW‑AI"
              stats={[
                { value: 5, suffix: "K+", label: "Papers summarized and extracted" },
                { value: 10, suffix: "x", label: "Faster literature review workflow" },
                { value: 99, suffix: "%", label: "Uptime across core features" },
              ]}
              className="max-w-md"
              cardClassName=""
            />
          </motion.div>
        </div>
      </section>

      {/* Light Showcase Section - 'Everything You Need for Research' */}
      <section className="relative isolate bg-[#F7F6F3] py-16 sm:py-20 md:py-28 lg:py-36 z-0">
        <div aria-hidden className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_60%_at_50%_40%,black,transparent)] bg-black/5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-neutral-900 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light tracking-tight leading-tight">
              <span className="block">Everything You Need</span>
              <span className="block">for Research.</span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-neutral-800 text-sm sm:text-base leading-relaxed">
              Comprehensive tools designed to streamline every aspect of your research workflow with AI-powered insights.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2 }}
            viewport={{ once: true }}
            className="mt-8 sm:mt-12 md:mt-14 lg:mt-16"
          >
            <div className="relative max-w-[1040px] mx-auto rounded-[12px] sm:rounded-[24px] bg-white ring-1 ring-black/5 shadow-[0_16px_32px_-10px_rgba(0,0,0,0.20)] sm:shadow-[0_32px_64px_-20px_rgba(0,0,0,0.30)] overflow-hidden">
              <div className="h-8 sm:h-11 bg-gradient-to-b from-neutral-100 to-neutral-50 border-b border-black/10 flex items-center gap-1.5 sm:gap-2.5 px-3 sm:px-5">
                <span className="inline-block h-[8px] w-[8px] sm:h-[10px] sm:w-[10px] rounded-full bg-[#FF5F57]" />
                <span className="inline-block h-[8px] w-[8px] sm:h-[10px] sm:w-[10px] rounded-full bg-[#FEBC2E]" />
                <span className="inline-block h-[8px] w-[8px] sm:h-[10px] sm:w-[10px] rounded-full bg-[#28C840]" />
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
      <section className="relative bg-neutral-950 text-white py-16 sm:py-20 md:py-28 lg:py-36 z-1">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(255,107,44,0.12),transparent)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2 }}
            viewport={{ once: true }}
            className="text-center mb-10 sm:mb-14"
          >
            <div className="text-xs tracking-[0.2em] text-neutral-400 uppercase mb-4">Benefits</div>
            <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight">Built for Researchers, Not Busywork.</h3>
            <p className="mt-4 text-neutral-300 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">Simple, powerful tools that feel effortless: explore the platform's core capabilities.</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {benefitItems.map((b) => {
              const Icon = b.icon
              return (
                <div key={b.title} className="group rounded-xl sm:rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500 p-4 sm:p-6 lg:p-7">
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-white mb-3 sm:mb-4" />
                  <div className="text-base sm:text-lg font-medium mb-2">{b.title}</div>
                  <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">{b.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Who We Serve Section - Pixel Perfect Match to Reference */}
      <section className="py-16 sm:py-20 md:py-28 lg:py-36 bg-white z-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2 }}
            viewport={{ once: true }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="text-xs tracking-[0.2em] text-neutral-500 uppercase mb-4 font-normal">WHO WE SERVE</div>
            <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-normal tracking-tight text-neutral-900 leading-[1.1]">
              For Students, Researchers &<br className="hidden sm:block" />Growing Teams
            </h3>
            <p className="mt-4 sm:mt-6 text-neutral-600 text-sm sm:text-base lg:text-lg leading-relaxed max-w-2xl mx-auto">
              From solo projects to research groups and labs, ThesisFlow meets you where you are and scales as your ambitions take off.
            </p>
          </motion.div>

          <div className="mt-10 sm:mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Card 1 - Students */}
            <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg hover:shadow-xl transition-all duration-500">
              <div className="relative aspect-[4/3]">
                <Image 
                  src="/students.png" 
                  alt="Students" 
                  fill 
                  className="object-cover transition-transform duration-1000 group-hover:scale-[1.02]" 
                />
                <div className="absolute inset-x-0 bottom-0">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <div className="relative p-4 sm:p-6">
                    <div className="text-xs tracking-[0.15em] uppercase text-white/90 mb-2 sm:mb-3 font-medium">STUDENTS</div>
                    <p className="text-white text-xs sm:text-sm leading-relaxed font-normal">Ace your literature reviews, organize notes, and turn messy PDFs into polished summaries.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2 - Independent Researchers */}
            <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg hover:shadow-xl transition-all duration-500">
              <div className="relative aspect-[4/3]">
                <Image 
                  src="/researchers.png" 
                  alt="Independent Researchers" 
                  fill 
                  className="object-cover transition-transform duration-1000 group-hover:scale-[1.02]" 
                />
                <div className="absolute inset-x-0 bottom-0">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <div className="relative p-4 sm:p-6">
                    <div className="text-xs tracking-[0.15em] uppercase text-white/90 mb-2 sm:mb-3 font-medium">INDEPENDENT RESEARCHERS</div>
                    <p className="text-white text-xs sm:text-sm leading-relaxed font-normal">Build a repeatable workflow—retrieval, deduping, and project planning in one place.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3 - Research Teams & Labs */}
            <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-50 to-green-100 shadow-lg hover:shadow-xl transition-all duration-500">
              <div className="relative aspect-[4/3]">
                <Image 
                  src="/research_labs.png" 
                  alt="Research Teams & Labs" 
                  fill 
                  className="object-cover transition-transform duration-1000 group-hover:scale-[1.02]" 
                />
                <div className="absolute inset-x-0 bottom-0">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <div className="relative p-4 sm:p-6">
                    <div className="text-xs tracking-[0.15em] uppercase text-white/90 mb-2 sm:mb-3 font-medium">RESEARCH TEAMS & LABS</div>
                    <p className="text-white text-xs sm:text-sm leading-relaxed font-normal">Share context, assign tasks, and publish faster with aligned timelines and sources.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Image Band: Doing research is hard enough */}
      <section className="relative min-h-[80vh] sm:min-h-[100vh] overflow-hidden z-1">
        <div className="absolute inset-0">
          <Image src="/research.png" alt="Research band" fill className="object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
        </div>
        <div className="relative z-10 h-full min-h-[80vh] sm:min-h-[100vh] flex items-center">
          <div className="container mx-auto px-4 sm:px-6 grid grid-cols-12 items-center gap-6 sm:gap-8">
            <div className="col-span-12 md:col-span-7 lg:col-span-6 text-white">
              <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-medium tracking-tight leading-tight">
                Your research
                <br />deserves clarity,
                <br />not clutter.
              </h3>
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  className={`${glassBtn} w-full sm:w-auto`}
                  onClick={(e) => { e.preventDefault?.(); handleProtectedAction('/explorer') }}
                >
                  Try the Explorer
                </Button>
                <Button
                  variant="outline"
                  className={`${glassBtnSoft} w-full sm:w-auto`}
                  onClick={(e) => { e.preventDefault?.(); handleProtectedAction('/planner') }}
                >
                  See the Planner
                </Button>
              </div>
            </div>
            
            {/* Right side content */}
            <div className="col-span-12 md:col-span-5 lg:col-span-4 lg:col-start-9 text-white mt-8 md:mt-0">
              <h4 className="text-white font-light text-lg sm:text-xl md:text-2xl uppercase leading-tight mb-4">
                From citations to summaries to automating tedious cleanup
              </h4>
              <p className="text-white text-sm sm:text-base leading-relaxed">
                ThesisFlow does the heavy lifting so you can spend more time thinking, writing, and making real progress.
              </p>
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
        className="z-0"
      >
        <Pricing />
      </motion.div>

      {/* FAQ Section */}
      <section id="faq" className="relative bg-neutral-950 text-white py-16 sm:py-20 md:py-28 lg:py-32 z-1">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(255,107,44,0.12),transparent)]" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-neutral-300 font-normal leading-relaxed max-w-3xl mx-auto">
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
