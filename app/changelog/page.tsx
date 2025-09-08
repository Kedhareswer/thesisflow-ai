"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, History, Megaphone } from "lucide-react";
import { motion } from "framer-motion";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Changelog1, type ChangelogEntry } from "@/components/ui/changelog-1";
import changelogData from "@/data/changelog.json";
import { useState, useMemo } from "react";

export default function ChangelogPage() {
  const allEntries = changelogData as ChangelogEntry[];
  const PAGE_SIZE = 4;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleEntries = useMemo(() => allEntries.slice(0, visibleCount), [allEntries, visibleCount]);
  const hasMore = visibleCount < allEntries.length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-mono">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6B2C]/10 text-[#FF6B2C]">
              <Megaphone className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">ThesisFlow-AI</span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center space-x-8 font-mono text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/explorer" className="hover:text-foreground transition-colors">Explorer</Link>
            <Link href="/planner" className="hover:text-foreground transition-colors">Planner</Link>
            <Link href="/changelog" className="text-foreground">Changelog</Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className={cn(
                buttonVariants({ size: "sm" }),
                "rounded-none font-mono bg-[#FF6B2C] hover:bg-[#FF6B2C]/90"
              )}
            >
              Open App <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-5xl w-full rounded-2xl bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat py-20 md:py-24">
        <div className="mx-auto max-w-3xl flex flex-col items-center text-center">
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-mono text-4xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl text-white"
          >
            Product Changelog
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mt-4 max-w-2xl text-base leading-relaxed text-white md:text-lg"
          >
            Follow the latest updates, improvements, and fixes across releases.
            We keep this page fresh so you can see what shipped recently.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-6"
          >
            <FeatureLabelWhite icon={<Sparkles className="h-4 w-4" />} label="Rapid shipping" />
            <FeatureLabelWhite icon={<History className="h-4 w-4" />} label="Versioned releases" />
            <FeatureLabelWhite icon={<Megaphone className="h-4 w-4" />} label="Transparent changes" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-12"
          >
            <Link
              href="#updates"
              className={cn(
                buttonVariants({ size: "lg" }),
                "rounded-none font-mono bg-white hover:bg-white/90 text-black"
              )}
            >
              See latest updates <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </motion.div>
        </div>
        </div>
      </section>


      {/* Changelog Section */}
      <div id="updates" className="mt-12">
        <Changelog1
          title="ThesisFlow-AI Changelog"
          description="Real, ongoing updates to ThesisFlow-AI across AI chat, research tools, extraction, models, and UX."
          entries={visibleEntries}
        />
        {hasMore && (
          <div className="container mx-auto px-4 -mt-12 mb-16 flex justify-center">
            <button
              onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, allEntries.length))}
              className={cn(
                buttonVariants({ size: "lg" }),
                "rounded-none font-mono bg-[#FF6B2C] hover:bg-[#FF6B2C]/90"
              )}
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-[#FF6B2C]/10 px-3 py-1 font-mono text-xs text-[#FF6B2C]">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function FeatureLabelWhite({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 font-mono text-xs text-white backdrop-blur-sm">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4 }}
      className="rounded-lg border bg-background p-8"
    >
      <h3 className="font-mono text-lg font-semibold leading-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </motion.div>
  );
}
