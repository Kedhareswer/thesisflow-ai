import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// A new component to create the bubble effect
const Bubbles = () => {
  // Keyframes for the bubble animation are defined here for self-containment
  const keyframes = `
    @keyframes rise {
      0% {
        transform: translateY(0) scale(1);
        opacity: 0.4;
      }
      100% {
        transform: translateY(-100px) scale(0);
        opacity: 0;
      }
    }
  `;

  return (
    <>
      <style>{keyframes}</style>
      <div className="absolute inset-0 z-5 overflow-hidden rounded-full">
        {/* Generate multiple spans to act as bubbles */}
        {Array.from({ length: 15 }).map((_, i) => (
          <span
            key={i}
            // The animation is paused by default and only runs on group-hover
            className="absolute bottom-[-10px] block rounded-full bg-foreground/20 [animation-play-state:paused] group-hover:[animation-play-state:running]"
            style={{
              width: `${Math.random() * 12 + 4}px`, // Random size
              height: `${Math.random() * 12 + 4}px`, // Random size
              left: `${Math.random() * 95}%`, // Random horizontal position
              animation: `rise ${2 + Math.random() * 3}s ${ // Random duration
                Math.random() * 4
              }s linear infinite`, // Random delay
            }}
          />
        ))}
      </div>
    </>
  );
};

export interface UsageBadgeProps {
  /** The icon to display next to the plan name. */
  icon: React.ReactNode;
  /** The name of the current plan (e.g., "Free", "Pro"). */
  planName: string;
  /** The current usage count. */
  usage: number;
  /** The total limit for the plan. */
  limit: number;
  /** The content to show inside the hover tooltip. */
  tooltipContent: React.ReactNode;
  /** Optional additional class names for custom styling. */
  className?: string;
}

const UsageBadge = React.forwardRef<HTMLDivElement, UsageBadgeProps>(
  ({ icon, planName, usage, limit, tooltipContent, className }, ref) => {
    // Calculate the percentage of usage for the progress bar
    const usagePercentage = limit > 0 ? (usage / limit) * 100 : 0;

    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              ref={ref}
              className={cn(
                // Added "group" to enable group-hover states for child elements
                // Increased padding (px-4 py-2) and text size (text-base)
                "group relative inline-flex cursor-default items-center gap-3 overflow-hidden rounded-full border bg-secondary px-4 py-2 text-base font-medium text-secondary-foreground shadow-sm transition-all hover:shadow-md",
                className
              )}
            >
              {/* Add the bubble animation component */}
              <Bubbles />

              {/* Icon */}
              <div className="z-10">{icon}</div>

              {/* Text Content */}
              <div className="z-10">
                <span>{planName}</span>
                <span className="ml-2 opacity-70">
                  {usage}/{limit} left
                </span>
              </div>
              
              {/* Progress Bar Background */}
              <div className="absolute inset-0 z-0 h-full w-full bg-secondary" />

              {/* Progress Bar Fill */}
              <div
                className="absolute inset-y-0 left-0 z-0 h-full bg-foreground/10 transition-all duration-300"
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-center">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

UsageBadge.displayName = "UsageBadge";

export { UsageBadge };
