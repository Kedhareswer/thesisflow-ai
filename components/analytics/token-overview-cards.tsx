"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, CreditCard, DollarSign, Clock } from "lucide-react";

export interface TokenOverviewProps {
  monthlyUsed: number;
  monthlyLimit: number;
  monthlyRemaining: number;
  // Optional current-range aggregates from analytics v2
  rangeTotals?: {
    tokens?: number;
    requests?: number;
    cost?: number;
  };
}

export function TokenOverviewCards({ monthlyUsed, monthlyLimit, monthlyRemaining, rangeTotals }: TokenOverviewProps) {
  const monthlyPct = monthlyLimit ? (monthlyUsed / monthlyLimit) * 100 : 0;

  // Calculate next reset date
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysUntilReset = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-blue-900">Monthly Remaining</CardTitle>
          <CardDescription>Plan allowance left</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600">{monthlyRemaining}</div>
          <p className="text-xs text-muted-foreground mt-1">{monthlyUsed} / {monthlyLimit} used</p>
          <Progress value={monthlyPct} className="mt-2 h-2" />
          <p className="text-xs text-green-600 font-medium mt-2">
            Resets in {daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''} ({nextMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
          </p>
        </CardContent>
      </Card>

      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-purple-900">Monthly Usage</CardTitle>
          <CardDescription>Consumed this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-500" />
            <div className="text-3xl font-bold text-purple-600">{monthlyUsed}</div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{monthlyPct.toFixed(1)}% of monthly limit</p>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Efficiency</span>
              <span className={`font-medium ${monthlyPct < 50 ? 'text-green-600' : monthlyPct < 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                {monthlyPct < 50 ? 'Excellent' : monthlyPct < 80 ? 'Good' : 'High'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-amber-900">Range Requests</CardTitle>
          <CardDescription>Requests in selected range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <div className="text-3xl font-bold text-amber-600">{(rangeTotals?.requests ?? 0).toLocaleString()}</div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            API calls tracked
          </p>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-100/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-green-900">Nova AI Cost</CardTitle>
          <CardDescription>Nova AI usage in range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div className="text-3xl font-bold text-green-600">${(rangeTotals?.cost ?? 0).toFixed(4)}</div>
          </div>
          <p className="text-xs text-green-600 font-medium mt-1">
            Llama-3.3-70B via Nova AI
          </p>
          <p className="text-xs text-muted-foreground">
            Included in your plan
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
