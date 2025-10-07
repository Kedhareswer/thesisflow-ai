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

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Monthly Remaining</CardTitle>
          <CardDescription>Plan allowance left</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{monthlyRemaining}</div>
          <p className="text-xs text-muted-foreground">{monthlyUsed} / {monthlyLimit} used</p>
          <Progress value={monthlyPct} className="mt-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Monthly Usage</CardTitle>
          <CardDescription>Consumed this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <div className="text-2xl font-bold">{monthlyUsed}</div>
          </div>
          <p className="text-xs text-muted-foreground">{monthlyPct.toFixed(1)}% of monthly limit</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Range Requests</CardTitle>
          <CardDescription>Requests in selected range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="text-2xl font-bold">{(rangeTotals?.requests ?? 0).toLocaleString()}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Nova AI Cost</CardTitle>
          <CardDescription>Nova AI usage cost in range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="text-2xl font-bold">${(rangeTotals?.cost ?? 0).toFixed(4)}</div>
          </div>
          <p className="text-xs text-green-600">Nova AI (Llama-3.3-70B) - Saved with plan pricing</p>
        </CardContent>
      </Card>
    </div>
  );
}
