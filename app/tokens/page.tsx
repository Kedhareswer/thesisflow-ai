"use client";

import React from "react";
import { RouteGuard } from "@/components/route-guard";
import { BackBreadcrumb } from "@/components/ui/back-breadcrumb";
import { TokenUsageDashboard } from "@/components/token/token-usage-dashboard";

export default function TokensPage() {
  return (
    <RouteGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <BackBreadcrumb className="mb-2" />
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">Tokens</h1>
              <p className="text-gray-600">View your token limits, usage, feature costs, and transaction history</p>
            </div>
          </div>
          <TokenUsageDashboard />
        </div>
      </div>
    </RouteGuard>
  );
}
