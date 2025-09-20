"use client";

import React from "react";
import { useUserPlan } from "@/hooks/use-user-plan";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export function TokenMeter({ compact = true }: { compact?: boolean }) {
  const { tokenStatus } = useUserPlan();

  if (!tokenStatus) return null;

  const monthlyPct = tokenStatus.monthlyLimit
    ? Math.min(100, (tokenStatus.monthlyUsed / tokenStatus.monthlyLimit) * 100)
    : 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-2 py-1 rounded-md border bg-background cursor-default select-none">
            <Sparkles className="h-4 w-4 text-[#FF6B2C]" />
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {tokenStatus.monthlyRemaining} / {tokenStatus.monthlyLimit} monthly
              </Badge>
            </div>
            {!compact && (
              <div className="w-20">
                <Progress value={monthlyPct} className="h-1" />
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center">
          <div className="text-xs space-y-2">
            <div className="flex items-center justify-between gap-6">
              <span className="text-muted-foreground">Monthly</span>
              <span className="font-medium">
                {tokenStatus.monthlyUsed} / {tokenStatus.monthlyLimit} used
              </span>
            </div>
            <Progress value={monthlyPct} className="h-1.5" />
            {(() => {
              if (!tokenStatus.lastMonthlyReset) return null;
              const d = new Date(tokenStatus.lastMonthlyReset);
              if (isNaN(d.getTime())) return null;
              return (
                <div className="pt-1 text-[10px] text-muted-foreground">
                  Resets — Monthly: {d.toLocaleDateString()}
                </div>
              );
            })()}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

