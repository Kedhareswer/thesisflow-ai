"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UpgradeBanner } from "@/components/ui/upgrade-banner";
import { useSupabaseAuth } from "@/components/supabase-auth-provider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

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
  const [userPlan, setUserPlan] = React.useState<UserPlan | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [mounted, setMounted] = React.useState(false);
  const { user } = useSupabaseAuth();
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
    const checkUserPlan = async () => {
      if (!user) {
        setLoading(false);
        setIsVisible(false);
        return;
      }

      try {
        // Get user plan
        const { data: planData } = await supabase
          .from('user_plans')
          .select('plan_type, status')
          .eq('user_id', user.id)
          .single();

        setUserPlan(planData);

        // Check if we should show the banner
        const eligible =
          (planData?.plan_type === 'free' && showForFreeUsers) ||
          (currentUsage >= limit * 0.8); // Show when 80% of limit is reached

        const shouldShow = eligible && !isDismissed();

        setIsVisible(shouldShow);
      } catch (error) {
        console.error('Error checking user plan:', error);
        setIsVisible(false);
      } finally {
        setLoading(false);
      }
    };

    checkUserPlan();
  }, [user, currentUsage, limit, showForFreeUsers, isDismissed]);

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
    
    if (userPlan?.plan_type === 'free') {
      return `Upgrade for unlimited ${feature} and advanced features`;
    }
    
    return `Upgrade for more ${feature} and advanced features`;
  };

  const getButtonText = () => {
    if (currentUsage >= limit) {
      return "Upgrade Now";
    }
    return "Upgrade to Pro";
  };

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
  return (
    <SmartUpgradeBanner
      feature="team members"
      limit={2}
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