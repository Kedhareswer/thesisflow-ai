"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Search, FileText, Calendar, Users, Bot, Lightbulb, ArrowRight, Zap, Shield, Globe, Clock, Target, Menu, Bird } from "lucide-react"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { Pricing } from "@/components/ui/pricing-cards"
import { FeaturesSectionWithHoverEffects, type FeatureItem } from "@/components/ui/feature-section-with-hover-effects"
import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1"
import { motion } from "framer-motion"
import { AccordionComponent } from "@/components/ui/faq-accordion"
import { SoftwareApplication, Organization, WebPage } from "@/components/schema/microdata-schema"
import { PixelTrail } from "@/components/ui/pixel-trail"
import { useScreenSize } from "@/components/hooks/use-screen-size"

// metadata moved to app/seo/root-metadata.ts

export default function HomePage() {
  const { user } = useSupabaseAuth()
  const router = useRouter()
  const screenSize = useScreenSize()

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
    <SoftwareApplication
      name="ThesisFlow-AI"
      description="Accelerate your research with AI-powered tools for discovering papers, summarizing content, and planning projects. All-in-one platform for scholars and professionals."
      applicationCategory="EducationalApplication"
      operatingSystem="Web Browser"
      url="https://thesisflow-ai.com"
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
        url="https://thesisflow-ai.com"
        dateModified={new Date().toISOString().split('T')[0]}
        author={{
          name: "ThesisFlow-AI",
          type: "Organization"
        }}
        breadcrumb={[
          { name: "Home", url: "https://thesisflow-ai.com" }
        ]}
      >
        <div className="container mx-auto px-4 min-h-screen bg-background font-mono">
      {/* Header */}
      <header className="flex h-16 items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bird className="h-6 w-6 text-[#FF6B2C]" />
          <span className="text-xl font-bold font-mono">ThesisFlow-AI</span>
        </div>
        
        {/* Desktop Navigation */}
        {user && (
          <nav className="hidden md:flex space-x-8">
            <Link href="/explorer" className="font-mono hover:text-[#FF6B2C] transition-colors">
              Explorer
            </Link>
            <Link href="/planner" className="font-mono hover:text-[#FF6B2C] transition-colors">
              Planner
            </Link>
            <Link href="/collaborate" className="font-mono hover:text-[#FF6B2C] transition-colors">
              Collaborate
            </Link>
            <Link href="#pricing" className="font-mono hover:text-[#FF6B2C] transition-colors">
              Pricing
            </Link>
            <Link href="#faq" className="font-mono hover:text-[#FF6B2C] transition-colors">
              FAQ
            </Link>
          </nav>
        )}
        
        {/* Desktop CTA + Mobile Menu */}
        <div className="flex items-center space-x-4">
          {user ? (
            <Button 
              asChild
              className="hidden md:inline-flex rounded-none bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 font-mono"
            >
              <Link href="/changelog">
                View Changelog
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button 
              asChild
              className="hidden md:inline-flex rounded-none bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 font-mono"
            >
              <Link href="/signup">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
          
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="flex flex-col space-y-4 mt-8">
                {user && (
                  <>
                    <Link href="/explorer" className="font-mono text-lg hover:text-[#FF6B2C] transition-colors">
                      Explorer
                    </Link>
                    <Link href="/planner" className="font-mono text-lg hover:text-[#FF6B2C] transition-colors">
                      Planner
                    </Link>
                    <Link href="/collaborate" className="font-mono text-lg hover:text-[#FF6B2C] transition-colors">
                      Collaborate
                    </Link>
                    <Link href="#pricing" className="font-mono text-lg hover:text-[#FF6B2C] transition-colors">
                      Pricing
                    </Link>
                    <Link href="#faq" className="font-mono text-lg hover:text-[#FF6B2C] transition-colors">
                      FAQ
                    </Link>
                  </>
                )}
                {user ? (
                  <Button 
                    asChild
                    className="rounded-none bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 font-mono mt-4"
                  >
                    <Link href="/changelog">
                      View Changelog
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button 
                    asChild
                    className="rounded-none bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 font-mono mt-4"
                  >
                    <Link href="/signup">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      {/* Hero Section */}
      <main className="relative flex flex-col items-center text-center py-24 min-h-[600px]">
        {/* PixelTrail Background */}
        <div className="absolute inset-0 z-0">
          <PixelTrail
            pixelSize={screenSize.lessThan('md') ? 32 : 48}
            fadeDuration={800}
            delay={200}
            pixelClassName="rounded-full bg-[#FF6B2C] opacity-60"
          />
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <Badge variant="outline" className="font-mono">
            Powered by Multiple AI Providers
          </Badge>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-6"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-mono leading-tight text-foreground">
            <motion.span 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="block"
            >
              Accelerate
            </motion.span>
            <motion.span 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="block"
            >
              Your Research
            </motion.span>
            <motion.span 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="block text-[#FF6B2C]"
            >
              with AI
            </motion.span>
          </h1>
        </motion.div>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-xl text-muted-foreground text-balance mb-8 max-w-2xl mx-auto leading-relaxed font-mono"
        >
          Discover papers, summarize instantly, and plan projects with an all-in-one AI platform for scholars and professionals.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-6 justify-center mb-12"
        >
          <div className="flex flex-wrap justify-center gap-3">
            {features.map((f) => (
              <Link
                key={f.title}
                href={f.href}
                className="text-sm font-mono border border-border text-muted-foreground rounded-full px-3 py-1 hover:text-[#FF6B2C] hover:border-[#FF6B2C] hover:bg-[#FF6B2C]/10 transition-colors"
              >
                {f.title}
              </Link>
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button 
            size="lg" 
            className="rounded-none bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 font-mono"
            onClick={() => handleProtectedAction('/explorer')}
          >
            Start Exploring
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" asChild className="font-mono">
            <Link href="/signup">Create Account</Link>
          </Button>
        </motion.div>
        </div>
      </main>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold font-mono mb-4 text-foreground">Everything you need for research</h2>
            <p className="text-xl text-muted-foreground font-mono leading-relaxed">
              Comprehensive tools designed to streamline every aspect of your research workflow.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-background border p-8 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleProtectedAction(feature.href)}
                >
                  <div className="w-12 h-12 bg-[#FF6B2C]/10 rounded-full flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-[#FF6B2C]" />
                  </div>
                  <h3 className="text-xl font-bold font-mono mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground font-mono leading-relaxed">{feature.description}</p>
                </motion.div>
              )
            })}
          </div>
          {/* Keep original hover effects component (not removed) */}
          <div className="mt-12">
            <FeaturesSectionWithHoverEffects features={hoverFeatures} />
          </div>
        </div>
      </section>

      {/* Research Challenges Section */}
      <section className="py-24 bg-background">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold font-mono text-foreground mb-6">
              Research Shouldn't Be This Hard
            </h2>
            <p className="text-xl text-muted-foreground font-mono max-w-3xl mx-auto leading-relaxed">
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
              <h3 className="text-xl font-bold font-mono text-foreground mb-3">Time Wasted</h3>
              <p className="text-muted-foreground font-mono leading-relaxed">Switching between 8+ different tools for literature review, writing, and collaboration.</p>
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
              <h3 className="text-xl font-bold font-mono text-foreground mb-3">Lost Focus</h3>
              <p className="text-muted-foreground font-mono leading-relaxed">Constant context switching breaks deep work and reduces research quality.</p>
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
              <h3 className="text-xl font-bold font-mono text-foreground mb-3">Team Chaos</h3>
              <p className="text-muted-foreground font-mono leading-relaxed">Fragmented communication and version control nightmares slow collaboration.</p>
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
              className="rounded-none bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 font-mono px-8 py-4 text-base shadow-lg"
              onClick={() => handleProtectedAction('/explorer')}
            >
              Solve This Now
              <ArrowRight className="w-5 h-5 inline ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-background py-24 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex text-center justify-center items-center gap-4 flex-col"
          >
            <Badge className="font-mono">Testimonials</Badge>
            <div className="flex gap-2 flex-col">
              <h2 className="text-4xl font-bold font-mono text-foreground max-w-xl text-center">
                What our users say
              </h2>
              <p className="text-xl leading-relaxed font-mono text-muted-foreground max-w-xl text-center">
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
      <section id="faq" className="py-24 bg-background">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold font-mono text-foreground mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-muted-foreground font-mono leading-relaxed">
              Answers to common questions about ThesisFlow-AI.
            </p>
          </motion.div>
          <AccordionComponent />
        </div>
      </section>
      
        </div>
      </WebPage>
    </SoftwareApplication>
  )
}
