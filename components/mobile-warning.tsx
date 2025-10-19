"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Monitor, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DISMISSED_KEY = "mobile-warning-dismissed";
const DISMISSED_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function MobileWarning() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Detect mobile device
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileDevice =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent
      );
    const isSmallScreen = window.innerWidth < 768;

    const isMobileEnv = isMobileDevice || isSmallScreen;
    setIsMobile(isMobileEnv);

    if (!isMobileEnv) return;

    // Check if user has dismissed recently
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const now = Date.now();
      if (now - dismissedTime < DISMISSED_DURATION) {
        // Still within dismissal period, but show banner
        setShowBanner(true);
        return;
      }
    }

    // Show full modal for first-time or expired dismissal
    setIsOpen(true);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    setIsOpen(false);
    setShowBanner(true);
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
  };

  if (!isMobile) return null;

  return (
    <>
      {/* Full Modal Warning */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
              <DialogTitle>Desktop Experience Recommended</DialogTitle>
            </div>
            <DialogDescription className="space-y-3 pt-2">
              <p>
                <strong>AI Project Planner</strong> is optimized for desktop and laptop
                devices for the best experience.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-amber-900">
                  Why Desktop is Better:
                </p>
                <ul className="text-sm text-amber-800 space-y-1 ml-4 list-disc">
                  <li>Complex analytics visualizations</li>
                  <li>Multi-panel document editing</li>
                  <li>Advanced search and filtering</li>
                  <li>Keyboard shortcuts for productivity</li>
                  <li>Better PDF and document viewing</li>
                </ul>
              </div>

              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Monitor className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">
                    Recommended Screen Size:
                  </p>
                  <p className="text-blue-700">
                    Minimum 1024px width (13" laptop or larger)
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                While you can use some features on mobile, certain functionality
                may be limited or difficult to navigate.
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 mt-4">
            <Button onClick={handleDismiss} className="w-full">
              I Understand, Continue Anyway
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              This message will reappear in 7 days
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Persistent Banner (after dismissal) */}
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-40 animate-in slide-in-from-bottom-5">
          <Alert className="bg-amber-50 border-amber-300 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1">
                <Smartphone className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <AlertDescription className="text-sm text-amber-900">
                  <strong>Mobile View:</strong> For the best experience, use a
                  desktop or laptop device.
                </AlertDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 flex-shrink-0"
                onClick={handleDismissBanner}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Alert>
        </div>
      )}
    </>
  );
}
