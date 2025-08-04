import * as React from "react";
import { UpgradeBanner } from "@/components/ui/upgrade-banner";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export function UpgradeBannerDemo() {
  const [isVisible, setIsVisible] = React.useState(true);
  const { toast } = useToast();

  const handleUpgradeClick = () => {
    toast({
      title: "Upgrade to Pro",
      description: "Redirecting to upgrade page...",
    });
    // Here you would typically redirect to your upgrade/pricing page
    console.log("Upgrade clicked - redirect to pricing page");
  };

  const handleClose = () => {
    setIsVisible(false);
    toast({
      title: "Banner dismissed",
      description: "You can show it again by clicking the button below.",
    });
  };

  if (!isVisible) {
    return (
      <div className="flex flex-col items-center gap-4 p-4">
        <p className="text-sm text-gray-600">Upgrade banner is hidden</p>
        <Button 
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
        >
          Show Upgrade Banner
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <UpgradeBanner
        buttonText="Upgrade to Pro"
        description="for unlimited projects and advanced features"
        onClose={handleClose}
        onClick={handleUpgradeClick}
      />
    </div>
  );
} 