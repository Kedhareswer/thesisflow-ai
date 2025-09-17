"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, Activity, CreditCard, Clock, AlertTriangle } from 'lucide-react';
import { tokenService, TokenTransaction, TokenStatus } from '@/lib/services/token.service';
import { supabase } from '@/integrations/supabase/client';

interface UserTokenData {
  dailyUsed: number;
  monthlyUsed: number;
  dailyLimit: number;
  monthlyLimit: number;
  dailyRemaining: number;
  monthlyRemaining: number;
}

interface FeatureCost {
  featureName: string;
  baseCost: number;
  description: string;
  costMultipliers: Record<string, number>;
}

export function TokenUsageDashboard() {
  const [tokenData, setTokenData] = useState<UserTokenData | null>(null);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [featureCosts, setFeatureCosts] = useState<FeatureCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        await loadTokenData(user.id);
      }
    };

    getCurrentUser();
  }, []);

  const loadTokenData = async (userId: string) => {
    try {
      setLoading(true);
      
      // Load token status, transactions, and feature costs in parallel
      const [tokenStatus, transactionList, costList] = await Promise.all([
        tokenService.getUserTokenStatus(userId),
        tokenService.getTokenTransactions(userId, 20),
        tokenService.getFeatureCosts()
      ]);

      setTokenData(tokenStatus);
      setTransactions(transactionList);
      setFeatureCosts(costList);
    } catch (error) {
      console.error('Error loading token data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!user) return;
    
    setRefreshing(true);
    await loadTokenData(user.id);
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deduct': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'refund': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'grant': return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'reset': return <RefreshCw className="h-4 w-4 text-gray-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getTransactionColor = (type: string, success: boolean) => {
    if (!success) return 'destructive';
    switch (type) {
      case 'deduct': return 'secondary';
      case 'refund': return 'default';
      case 'grant': return 'default';
      case 'reset': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Token Usage</h2>
          <RefreshCw className="h-5 w-5 animate-spin" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-20" />
              <CardContent className="h-16" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!tokenData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Token Data Unavailable</h3>
          <p className="text-muted-foreground mb-4">Unable to load your token usage data.</p>
          <Button onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const dailyPercentage = (tokenData.dailyUsed / tokenData.dailyLimit) * 100;
  const monthlyPercentage = (tokenData.monthlyUsed / tokenData.monthlyLimit) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Token Usage</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Usage Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Remaining</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{tokenData.dailyRemaining}</div>
            <p className="text-xs text-muted-foreground">
              {tokenData.dailyUsed} / {tokenData.dailyLimit} used
            </p>
            <Progress value={dailyPercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Remaining</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{tokenData.monthlyRemaining}</div>
            <p className="text-xs text-muted-foreground">
              {tokenData.monthlyUsed} / {tokenData.monthlyLimit} used
            </p>
            <Progress value={monthlyPercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tokenData.dailyUsed}</div>
            <p className="text-xs text-muted-foreground">
              {dailyPercentage.toFixed(1)}% of limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tokenData.monthlyUsed}</div>
            <p className="text-xs text-muted-foreground">
              {monthlyPercentage.toFixed(1)}% of limit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Feature Costs */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Costs</CardTitle>
          <CardDescription>Token costs for different features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {featureCosts.map((cost) => (
              <div key={cost.featureName} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <p className="font-medium capitalize">{cost.featureName.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">{cost.description}</p>
                </div>
                <Badge variant="secondary">{cost.baseCost} token{cost.baseCost !== 1 ? 's' : ''}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest token usage history</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <div className="flex items-center space-x-3">
                    {getTransactionIcon(transaction.operationType)}
                    <div>
                      <p className="font-medium capitalize">
                        {transaction.featureName.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getTransactionColor(transaction.operationType, transaction.success)}>
                      {transaction.operationType === 'deduct' ? '-' : '+'}
                      {transaction.tokensAmount}
                    </Badge>
                    {!transaction.success && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
