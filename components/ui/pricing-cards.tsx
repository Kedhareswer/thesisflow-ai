"use client";

import { Check, MoveRight, Sparkles, Zap, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CircleCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

function Pricing() {
  return (
    <div className="w-full py-20 lg:py-40 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="flex text-center justify-center items-center gap-6 flex-col">
          <Badge variant="secondary" className="px-4 py-2 text-sm font-semibold bg-[#FF6B2C]/10 text-[#FF6B2C] border-[#FF6B2C]/20">
            Pricing
          </Badge>
          <div className="flex gap-4 flex-col">
            <h2 className="text-4xl md:text-6xl lg:text-7xl tracking-tight max-w-4xl text-center font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Choose a Plan
            </h2>
            <p className="text-xl md:text-2xl leading-relaxed tracking-tight text-muted-foreground max-w-3xl text-center font-light">
              Unlock the full potential of ThesisFlow-AI.
            </p>
            <p className="text-sm md:text-base leading-relaxed tracking-tight text-muted-foreground max-w-4xl text-center font-normal">
              Plans use tokens that reset <span className="font-semibold text-foreground">monthly</span>. Tokens are consumed by AI Chat, Deep Research, Summarizer, Plan-and-Execute, and related AI features.
            </p>
          </div>

          <div className="grid pt-16 text-left grid-cols-1 lg:grid-cols-2 w-full gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <Card className="w-full rounded-xl border-2 border-border/50 hover:border-border transition-all duration-300 shadow-lg hover:shadow-xl bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-8">
                <CardTitle className="text-2xl">
                  <span className="flex flex-row gap-4 items-center font-semibold">
                    <Sparkles className="h-6 w-6 text-blue-500" />
                    Free
                  </span>
                </CardTitle>
                <CardDescription className="text-base font-medium text-muted-foreground">
                  Token-based access for individual researchers and students.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-8 justify-start">
                  <p className="flex flex-row items-center gap-2 text-2xl">
                    <span className="text-5xl font-bold text-foreground">$0</span>
                    <span className="text-base text-muted-foreground font-medium">/ month</span>
                  </p>
                  <div className="flex flex-col gap-5 justify-start">
                    <div className="flex flex-row gap-4">
                      <Check className="w-5 h-5 mt-1 text-green-600 flex-shrink-0" />
                      <div className="flex flex-col">
                        <p className="font-semibold text-foreground">Tokens Included</p>
                        <p className="text-muted-foreground text-sm font-medium">50 monthly tokens</p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-5 h-5 mt-1 text-green-600 flex-shrink-0" />
                      <div className="flex flex-col">
                        <p className="font-semibold text-foreground">Explorer Access</p>
                        <p className="text-muted-foreground text-sm font-medium">Limited access to research explorer</p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-5 h-5 mt-1 text-green-600 flex-shrink-0" />
                      <div className="flex flex-col">
                        <p className="font-semibold text-foreground">Summarizer Tool</p>
                        <p className="text-muted-foreground text-sm font-medium">Basic AI summarizer</p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-5 h-5 mt-1 text-green-600 flex-shrink-0" />
                      <div className="flex flex-col">
                        <p className="font-semibold text-foreground">Documentation</p>
                        <p className="text-muted-foreground text-sm font-medium">Access to platform documentation and guides</p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <X className="w-5 h-5 mt-1 text-red-500 flex-shrink-0" />
                      <div className="flex flex-col">
                        <p className="font-semibold text-foreground/70">Team Access</p>
                        <p className="text-muted-foreground text-sm font-medium">No access to teams or collaboration features</p>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="gap-4 h-12 text-base font-semibold border-2 hover:bg-muted/50 transition-all duration-200">
                    Get Started <MoveRight className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="w-full rounded-xl border-2 border-[#FF6B2C]/30 hover:border-[#FF6B2C]/50 transition-all duration-300 shadow-2xl hover:shadow-3xl bg-gradient-to-br from-card via-card to-[#FF6B2C]/5 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B2C]/5 via-transparent to-[#FF6B2C]/10 pointer-events-none" />
              <CardHeader className="pb-8 relative z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">
                    <span className="flex flex-row gap-4 items-center font-semibold">
                      <Zap className="h-6 w-6 text-[#FF6B2C]" />
                      Pro
                    </span>
                  </CardTitle>
                  <Badge className="text-xs font-bold bg-[#FF6B2C] text-white px-3 py-1 shadow-lg">Most Popular</Badge>
                </div>
                <CardDescription className="text-base font-medium text-muted-foreground">
                  Higher token limits and advanced features.
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="flex flex-col gap-8 justify-start">
                  <p className="flex flex-row items-center gap-2 text-2xl">
                    <span className="text-5xl font-bold text-[#FF6B2C]">$29</span>
                    <span className="text-base text-muted-foreground font-medium">/ month</span>
                  </p>
                  <div className="flex flex-col gap-5 justify-start">
                    <div className="flex flex-row gap-4">
                      <Check className="w-5 h-5 mt-1 text-green-600 flex-shrink-0" />
                      <div className="flex flex-col">
                        <p className="font-semibold text-foreground">Tokens Included</p>
                        <p className="text-muted-foreground text-sm font-medium">500 monthly tokens</p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-5 h-5 mt-1 text-green-600 flex-shrink-0" />
                      <div className="flex flex-col">
                        <p className="font-semibold text-foreground">Everything in Free</p>
                        <p className="text-muted-foreground text-sm font-medium">All basic features included</p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-5 h-5 mt-1 text-green-600 flex-shrink-0" />
                      <div className="flex flex-col">
                        <p className="font-semibold text-foreground">Advanced Collaboration</p>
                        <p className="text-muted-foreground text-sm font-medium">Up to 10 team members with real-time chat</p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-5 h-5 mt-1 text-green-600 flex-shrink-0" />
                      <div className="flex flex-col">
                        <p className="font-semibold text-foreground">AI Writing Assistant</p>
                        <p className="text-muted-foreground text-sm font-medium">Advanced content generation and editing</p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-5 h-5 mt-1 text-green-600 flex-shrink-0" />
                      <div className="flex flex-col">
                        <p className="font-semibold text-foreground">Unlimited Documents</p>
                        <p className="text-muted-foreground text-sm font-medium">Store and manage unlimited project files</p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">
                      <Check className="w-5 h-5 mt-1 text-green-600 flex-shrink-0" />
                      <div className="flex flex-col">
                        <p className="font-semibold text-foreground">Priority Support</p>
                        <p className="text-muted-foreground text-sm font-medium">Faster response times and dedicated help</p>
                      </div>
                    </div>
                  </div>
                  <Button className="gap-4 h-12 text-base font-semibold bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                    Start Free Trial <MoveRight className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// New Pricing2 component (animated grid, particles, yearly/monthly toggle)
interface PricingFeature {
  text: string;
}
interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  features: PricingFeature[];
  button: {
    text: string;
    url: string;
  };
}
interface Pricing2Props {
  heading?: string;
  description?: string;
  plans?: PricingPlan[];
}

const Pricing2 = ({
  heading = "Plans & Pricing",
  description = "Choose the plan that matches your workflow and scale with ease.",
  plans = [
    {
      id: "starter",
      name: "Starter",
      description: "For individuals just getting started",
      monthlyPrice: "$12",
      yearlyPrice: "$9",
      features: [
        { text: "1 project" },
        { text: "Basic analytics" },
        { text: "Email support" },
        { text: "500MB storage" },
      ],
      button: {
        text: "Get Started",
        url: "https://21st.dev",
      },
    },
    {
      id: "growth",
      name: "Growth",
      description: "For teams building serious products",
      monthlyPrice: "$39",
      yearlyPrice: "$29",
      features: [
        { text: "Unlimited projects" },
        { text: "Team collaboration tools" },
        { text: "Priority chat support" },
        { text: "Advanced analytics" },
      ],
      button: {
        text: "Upgrade Now",
        url: "https://21st.dev",
      },
    },
  ],
}: Pricing2Props) => {
  const [isYearly, setIsYearly] = useState(false);

  // --- minimal hero particles ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const setSize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect?.width ?? window.innerWidth));
      const h = Math.max(1, Math.floor(rect?.height ?? window.innerHeight));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setSize();

    type P = { x: number; y: number; v: number; o: number };
    let parts: P[] = [];
    let raf = 0;

    const make = (): P => ({
      x: Math.random() * (canvas.width / (window.devicePixelRatio || 1)),
      y: Math.random() * (canvas.height / (window.devicePixelRatio || 1)),
      v: Math.random() * 0.25 + 0.05,
      o: Math.random() * 0.35 + 0.15,
    });

    const init = () => {
      parts = [];
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      const count = Math.floor((w * h) / 12000);
      for (let i = 0; i < count; i++) parts.push(make());
    };

    const draw = () => {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, h);
      parts.forEach((p) => {
        p.y -= p.v;
        if (p.y < 0) {
          p.x = Math.random() * w;
          p.y = h + Math.random() * 40;
          p.v = Math.random() * 0.25 + 0.05;
          p.o = Math.random() * 0.35 + 0.15;
        }
        ctx.fillStyle = `rgba(250,250,250,${p.o})`;
        ctx.fillRect(p.x, p.y, 0.7, 2.2);
      });
      raf = requestAnimationFrame(draw);
    };

    const onResize = () => {
      setSize();
      init();
    };

    const ro = new ResizeObserver(onResize);
    ro.observe(canvas.parentElement || document.body);

    init();
    raf = requestAnimationFrame(draw);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      data-locked
      className="relative min-h-screen py-24 md:py-32 bg-zinc-950 text-zinc-50 overflow-hidden isolate"
    >
      <style>{`
        :where(html, body, #__next){
          margin:0; min-height:100%;
          background:#0b0b0c; color:#f6f7f8; color-scheme:dark;
          overflow-x:hidden; scrollbar-gutter:stable both-edges;
        }
        html{ background:#0b0b0c }
        section[data-locked]{ color:#f6f7f8; color-scheme:dark }
        .accent-lines{position:absolute;inset:0;pointer-events:none;opacity:.7}
        .hline,.vline{position:absolute;background:#27272a}
        .hline{left:0;right:0;height:1px;transform:scaleX(0);transform-origin:50% 50%;animation:drawX .6s ease forwards}
        .vline{top:0;bottom:0;width:1px;transform:scaleY(0);transform-origin:50% 0%;animation:drawY .7s ease forwards}
        .hline:nth-child(1){top:18%;animation-delay:.08s}
        .hline:nth-child(2){top:50%;animation-delay:.16s}
        .hline:nth-child(3){top:82%;animation-delay:.24s}
        .vline:nth-child(4){left:18%;animation-delay:.20s}
        .vline:nth-child(5){left:50%;animation-delay:.28s}
        .vline:nth-child(6){left:82%;animation-delay:.36s}
        @keyframes drawX{to{transform:scaleX(1)}}
        @keyframes drawY{to{transform:scaleY(1)}}
        .card-animate{opacity:0;transform:translateY(12px);animation:fadeUp .6s ease .25s forwards}
        @keyframes fadeUp{to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Subtle vignette */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(80%_60%_at_50%_15%,rgba(255,255,255,0.06),transparent_60%)]" />

      {/* Animated accent lines */}
      <div aria-hidden className="accent-lines">
        <div className="hline" />
        <div className="hline" />
        <div className="hline" />
        <div className="vline" />
        <div className="vline" />
        <div className="vline" />
      </div>

      {/* Particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-50 pointer-events-none"
      />

      {/* Content */}
      <div className="relative container">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
          <h2 className="text-pretty text-4xl font-bold lg:text-6xl">{heading}</h2>
          <p className="text-zinc-400 lg:text-xl">{description}</p>

          <div className="flex items-center gap-3 text-lg">
            Monthly
            <Switch checked={isYearly} onCheckedChange={() => setIsYearly(!isYearly)} />
            Yearly
          </div>

          <div className="mt-2 flex flex-col items-stretch gap-6 md:flex-row">
            {plans.map((plan, i) => (
              <Card
                key={plan.id}
                className={`card-animate flex w-80 flex-col justify-between text-left border-zinc-800 bg-zinc-900/70 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60 ${
                  i === 1 ? "md:translate-y-2" : ""
                }`}
                style={{ animationDelay: `${0.25 + i * 0.08}s` }}
              >
                <CardHeader>
                  <CardTitle>
                    <p className="text-zinc-50">{plan.name}</p>
                  </CardTitle>
                  <p className="text-sm text-zinc-400">{plan.description}</p>
                  <span className="text-4xl font-bold text-white">
                    {isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  <p className="text-zinc-500">
                    Billed{" "}
                    {isYearly
                      ? `$${Number(plan.yearlyPrice.slice(1)) * 12}`
                      : `$${Number(plan.monthlyPrice.slice(1)) * 12}`} {" "}
                    annually
                  </p>
                </CardHeader>

                <CardContent>
                  <Separator className="mb-6 bg-zinc-800" />
                  {plan.id !== plans[0]?.id && (
                    <p className="mb-3 font-semibold text-zinc-200">
                      Everything in Starter, and:
                    </p>
                  )}
                  <ul className="space-y-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-zinc-200">
                        <CircleCheck className="size-4 text-zinc-400" />
                        <span>{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="mt-auto">
                  <Button
                    asChild
                    className="w-full rounded-lg bg-[#FF6B2C] text-white hover:bg-[#FF6B2C]/90"
                  >
                    <a href={plan.button.url} target="_blank" rel="noreferrer">
                      {plan.button.text}
                      <ArrowRight className="ml-2 size-4" />
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export { Pricing, Pricing2 };