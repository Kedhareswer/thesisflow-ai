"use client";

import { useState, useEffect } from "react";
import { X, AlertTriangle, Bug, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DevelopmentNoticeProps {
  className?: string;
}

export function DevelopmentNotice({ className }: DevelopmentNoticeProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has dismissed this notice before
    const hasDismissed = localStorage.getItem('collaborate-dev-notice-dismissed');
    if (!hasDismissed) {
      // Show notice after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('collaborate-dev-notice-dismissed', 'true');
  };

  const handleReportBug = () => {
    // You can customize this to open a bug report form or link
    window.open('mailto:support@yourplatform.com?subject=Bug Report - Collaborate Page', '_blank');
  };

  // Development helper: Reset dismissed state (remove in production)
  const resetDismissedState = () => {
    localStorage.removeItem('collaborate-dev-notice-dismissed');
    setIsVisible(true);
  };

  // Add this to window for development testing (remove in production)
  if (typeof window !== 'undefined') {
    (window as any).resetDevNotice = resetDismissedState;
  }

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">Development Notice</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-sm">
            This page is under heavy development
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Bug className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Many functionalities need heavy work</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Some features may be incomplete or broken
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Please report any issues</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Help us improve by reporting bugs and broken components
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button 
              onClick={handleReportBug}
              className="w-full"
              size="sm"
            >
              <Bug className="h-4 w-4 mr-2" />
              Report Bug or Issue
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleDismiss}
              className="w-full"
              size="sm"
            >
              Got it, thanks!
            </Button>
          </div>

          <div className="pt-2 border-t">
            <Badge variant="secondary" className="text-xs">
              Beta Version
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

 