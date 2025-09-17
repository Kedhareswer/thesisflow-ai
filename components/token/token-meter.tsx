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

  const dailyPct = tokenStatus.dailyLimit
    ? Math.min(100, (tokenStatus.dailyUsed / tokenStatus.dailyLimit) * 100)
    : 0;
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
                {tokenStatus.dailyRemaining} / {tokenStatus.dailyLimit} daily
              </Badge>
            </div>
            {!compact && (
              <div className="w-20 space-y-1">
                <Progress value={dailyPct} className="h-1" />
                <Progress value={monthlyPct} className="h-1" />
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center">
          <div className="text-xs space-y-2">
            <div className="flex items-center justify-between gap-6">
              <span className="text-muted-foreground">Daily</span>
              <span className="font-medium">
                {tokenStatus.dailyUsed} / {tokenStatus.dailyLimit} used
              </span>
            </div>
            <Progress value={dailyPct} className="h-1.5" />
            <div className="flex items-center justify-between gap-6">
              <span className="text-muted-foreground">Monthly</span>
              <span className="font-medium">
                {tokenStatus.monthlyUsed} / {tokenStatus.monthlyLimit} used
              </span>
            </div>
            <Progress value={monthlyPct} className="h-1.5" />
            {(tokenStatus.lastDailyReset || tokenStatus.lastMonthlyReset) && (
              <div className="pt-1 text-[10px] text-muted-foreground">
                Resets — Daily: {tokenStatus.lastDailyReset ? new Date(tokenStatus.lastDailyReset).toLocaleDateString() : "—"} • Monthly: {tokenStatus.lastMonthlyReset ? new Date(tokenStatus.lastMonthlyReset).toLocaleDateString() : "—"}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
