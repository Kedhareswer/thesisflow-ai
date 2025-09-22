import { Check, MoveRight, PhoneCall, Sparkles, Users, Zap, Shield, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function Pricing() {
  return (
    <div className="w-full py-20 lg:py-40 bg-gradient-to-br from-background via-background to-muted/20" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <div className="container mx-auto px-4">
        <div className="flex text-center justify-center items-center gap-6 flex-col">
          <Badge variant="secondary" className="px-4 py-2 text-sm font-semibold bg-[#FF6B2C]/10 text-[#FF6B2C] border-[#FF6B2C]/20">
            Pricing
          </Badge>
          <div className="flex gap-4 flex-col">
            <h2 
              className="max-w-4xl bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent"
              style={{
                fontSize: '40px',
                fontWeight: 300,
                letterSpacing: '-0.8px',
                lineHeight: '44px',
                textAlign: 'center'
              }}
            >
              Choose a Plan
            </h2>
            <p 
              className="text-muted-foreground max-w-4xl text-center"
              style={{
                fontSize: '14px',
                fontWeight: 300,
                lineHeight: '20px'
              }}
            >
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

export { Pricing }; 