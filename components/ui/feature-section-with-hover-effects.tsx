import React from "react";
import { cn } from "@/lib/utils";

export type FeatureItem = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

export function FeaturesSectionWithHoverEffects({
  features = defaultFeatures,
  className,
}: {
  features?: FeatureItem[];
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 relative z-10 py-10 max-w-7xl mx-auto", className)}>
      {features.map((feature, index) => (
        <Feature key={feature.title} {...feature} index={index} />)
      )}
    </div>
  );
}

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r py-10 relative group/feature dark:border-neutral-800",
        (index === 0 || index === 3) && "lg:border-l dark:border-neutral-800",
        index < 3 && "lg:border-b dark:border-neutral-800"
      )}
    >
      {index < 3 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-neutral-100 dark:from-neutral-800 to-transparent pointer-events-none" />
      )}
      {index >= 3 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-neutral-100 dark:from-neutral-800 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-neutral-600 dark:text-neutral-400">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-300 dark:bg-neutral-700 group-hover/feature:bg-[#FF6B2C] transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-neutral-800 dark:text-neutral-100">
          {title}
        </span>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};

// Default placeholders (unused by home as we'll pass data)
const defaultFeatures: FeatureItem[] = [
  {
    title: "Built for developers",
    description: "Built for engineers, developers, dreamers, thinkers and doers.",
    icon: <span role="img" aria-label="terminal">💻</span>,
  },
  {
    title: "Ease of use",
    description: "It's as easy as using an Apple, and as expensive as buying one.",
    icon: <span role="img" aria-label="ease">✨</span>,
  },
  {
    title: "Pricing like no other",
    description: "Our prices are best in the market. No cap, no lock, no credit card required.",
    icon: <span role="img" aria-label="pricing">💸</span>,
  },
  {
    title: "100% Uptime guarantee",
    description: "We just cannot be taken down by anyone.",
    icon: <span role="img" aria-label="cloud">☁️</span>,
  },
  {
    title: "Multi-tenant Architecture",
    description: "You can simply share passwords instead of buying new seats",
    icon: <span role="img" aria-label="route">🧭</span>,
  },
  {
    title: "24/7 Customer Support",
    description: "We are available a 100% of the time. Atleast our AI Agents are.",
    icon: <span role="img" aria-label="help">❓</span>,
  },
  {
    title: "Money back guarantee",
    description: "If you donot like EveryAI, we will convince you to like us.",
    icon: <span role="img" aria-label="guarantee">✅</span>,
  },
  {
    title: "And everything else",
    description: "I just ran out of copy ideas. Accept my sincere apologies",
    icon: <span role="img" aria-label="heart">❤️</span>,
  },
];
