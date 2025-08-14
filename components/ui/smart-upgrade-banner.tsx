"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UpgradeBanner } from "@/components/ui/upgrade-banner";
import { useSupabaseAuth } from "@/components/supabase-auth-provider";
import { useToast } from "@/components/ui/use-toast";
import { useUserPlan } from "@/hooks/use-user-plan";

interface SmartUpgradeBannerProps {
  feature?: string;
  limit?: number;
  currentUsage?: number;
  className?: string;
  showForFreeUsers?: boolean;
  customMessage?: string;
  onUpgradeClick?: () => void;
  onClose?: () => void;
}

interface UserPlan {
  plan_type: string;
  status: string;
}

export function SmartUpgradeBanner({
  feature = "projects",
  limit = 3,
  currentUsage = 0,
  className,
  showForFreeUsers = true,
  customMessage,
  onUpgradeClick,
  onClose
}: SmartUpgradeBannerProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [mounted, setMounted] = React.useState(false);
  const { user } = useSupabaseAuth();
  const { planData, isProfessionalOrHigher, getUsageForFeature, isPlanDataReady } = useUserPlan();
  const { toast } = useToast();

  // Prevent flash on mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Helper: localStorage dismissal key (per user + feature)
  const getDismissKey = React.useCallback(() => {
    const uid = user?.id || 'anon';
    return `upgrade_banner_dismissed:${uid}:${feature}`;
  }, [user?.id, feature]);

  const isDismissed = React.useCallback(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(getDismissKey()) : null;
      if (!raw) return false;
      const ts = Number(raw);
      return Number.isFinite(ts) && Date.now() < ts;
    } catch {
      return false;
    }
  }, [getDismissKey]);

  // Check user plan and usage (and respect persisted dismissal)
  React.useEffect(() => {
    if (!mounted) return;
    if (!user) {
      setLoading(false);
      setIsVisible(false);
      return;
    }

    // Wait until plan data is ready to avoid flicker and extra calls
    if (!isPlanDataReady()) {
      setLoading(true);
      return;
    }

    try {
      const isProOrAbove = isProfessionalOrHigher();

      // Determine effective limit from plan usage if available
      const usage = getUsageForFeature(feature === 'team members' ? 'team_members' : feature.replace(' ', '_'));
      const effectiveLimit = typeof usage?.limit_count === 'number' && usage.limit_count > 0 ? usage.limit_count : limit;

      const nearLimit = !!(usage && !usage.is_unlimited && currentUsage >= Math.max(1, Math.floor(effectiveLimit * 0.8)));
      const eligible: boolean = (!isProOrAbove && showForFreeUsers) || nearLimit;
      const shouldShow: boolean = !!(eligible && !isDismissed());

      setIsVisible(shouldShow);
    } catch (error) {
      console.error('Error determining upgrade banner visibility:', error);
      setIsVisible(false);
    } finally {
      setLoading(false);
    }
  }, [mounted, user?.id, currentUsage, limit, showForFreeUsers, isDismissed, isProfessionalOrHigher, getUsageForFeature, isPlanDataReady]);

  const handleUpgradeClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      // Default upgrade behavior
      toast({
        title: "Upgrade to Pro",
        description: "Redirecting to upgrade page...",
      });
      // Redirect to pricing page or open upgrade modal
      window.location.href = '/settings?tab=pricing';
    }
  };

  const handleClose = () => {
    // Persist dismissal for 24 hours to avoid blocking UI repeatedly
    try {
      const oneDayMs = 24 * 60 * 60 * 1000;
      const until = Date.now() + oneDayMs;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(getDismissKey(), String(until));
      }
    } catch {}
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };

  // Don't show if loading or not visible - prevent flash
  if (!mounted || loading) {
    return null;
  }

  if (!isVisible) {
    return null;
  }

  // Generate appropriate message based on context
  const getMessage = () => {
    if (customMessage) return customMessage;
    
    if (currentUsage >= limit) {
      return `You've reached your ${limit} ${feature} limit`;
    }
    
    if (!isProfessionalOrHigher()) {
      return `Upgrade for unlimited ${feature} and advanced features`;
    }
    
    return `Upgrade for more ${feature} and advanced features`;
  };

  const getButtonText = () => (currentUsage >= limit ? "Upgrade Now" : "Upgrade to Pro");

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={className}
        >
          <UpgradeBanner
            buttonText={getButtonText()}
            description={getMessage()}
            onClose={handleClose}
            onClick={handleUpgradeClick}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Specific upgrade banners for different features
export function ProjectLimitBanner({ currentUsage = 0, className }: { currentUsage?: number; className?: string }) {
  return (
    <SmartUpgradeBanner
      feature="projects"
      limit={3}
      currentUsage={currentUsage}
      className={className}
      customMessage="Upgrade to create unlimited research projects"
    />
  );
}

export function TaskLimitBanner({ currentUsage = 0, className }: { currentUsage?: number; className?: string }) {
  return (
    <SmartUpgradeBanner
      feature="tasks"
      limit={10}
      currentUsage={currentUsage}
      className={className}
      customMessage="Upgrade for unlimited tasks and advanced project management"
    />
  );
}

export function TeamLimitBanner({ currentUsage = 0, className }: { currentUsage?: number; className?: string }) {
  // Use real plan limits; hide for Pro/Enterprise
  const { isProfessionalOrHigher, getUsageForFeature, isPlanDataReady } = useUserPlan();

  if (isProfessionalOrHigher() && isPlanDataReady()) {
    return null;
  }

  // Try to infer the actual limit from plan data; fall back to 2 for free plan UX
  const usage = getUsageForFeature('team_members');
  const effectiveLimit = typeof usage?.limit_count === 'number' && usage.limit_count > 0 ? usage.limit_count : 2;

  return (
    <SmartUpgradeBanner
      feature="team members"
      limit={effectiveLimit}
      currentUsage={currentUsage}
      className={className}
      customMessage="Upgrade for unlimited team collaboration"
    />
  );
}

export function StorageLimitBanner({ currentUsage = 0, className }: { currentUsage?: number; className?: string }) {
  return (
    <SmartUpgradeBanner
      feature="storage"
      limit={100} // MB
      currentUsage={currentUsage}
      className={className}
      customMessage="Upgrade for unlimited file storage and document management"
    />
  );
} 