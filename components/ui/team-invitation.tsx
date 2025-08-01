import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface TeamInvitationProps {
  invitation: {
    id: string;
    team: {
      id: string;
      name: string;
      description?: string;
    };
    inviter: {
      id: string;
      full_name: string;
      avatar_url?: string;
    };
    role: 'viewer' | 'editor' | 'admin';
    personal_message?: string;
    created_at: string;
  };
  onAccept?: (invitationId: string) => Promise<void>;
  onDecline?: (invitationId: string) => Promise<void>;
  className?: string;
}

export function TeamInvitation({ 
  invitation, 
  onAccept, 
  onDecline, 
  className 
}: TeamInvitationProps) {
  const [isResponding, setIsResponding] = useState(false);
  const { toast } = useToast();

  const handleAccept = async () => {
    if (!onAccept) return;
    
    try {
      setIsResponding(true);
      await onAccept(invitation.id);
      toast({
        title: "Invitation accepted",
        description: `You've joined ${invitation.team.name}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept invitation",
        variant: "destructive",
      });
    } finally {
      setIsResponding(false);
    }
  };

  const handleDecline = async () => {
    if (!onDecline) return;
    
    try {
      setIsResponding(true);
      await onDecline(invitation.id);
      toast({
        title: "Invitation declined",
        description: "You've declined the invitation",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to decline invitation",
        variant: "destructive",
      });
    } finally {
      setIsResponding(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const inviteTime = new Date(timestamp);
    const diffMs = now.getTime() - inviteTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return inviteTime.toLocaleDateString();
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'editor':
        return 'Editor';
      case 'viewer':
        return 'Viewer';
      default:
        return role;
    }
  };

  return (
    <div className={cn("w-full max-w-xl mx-auto", className)}>
      <div className="relative bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-[0_1px_6px_0_rgba(0,0,0,0.02)] rounded-xl p-4">
        <div className="flex items-center gap-4">
          <div className="relative h-10 w-10 flex-shrink-0">
            <Image
              src={invitation.inviter.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face"}
              alt={invitation.inviter.full_name}
              sizes="40px"
              fill
              className="rounded-full object-cover"
            />
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-zinc-950" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Team Invitation
                </p>
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {invitation.inviter.full_name} invited you to join{" "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {invitation.team.name}
                  </span>
                  {" "}as {getRoleDisplay(invitation.role)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDecline}
              disabled={isResponding}
              className="rounded-lg flex items-center justify-center h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-950/50 text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400 transition-colors"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAccept}
              disabled={isResponding}
              className={cn(
                "rounded-lg flex items-center justify-center h-8 w-8 p-0",
                "hover:bg-emerald-50 dark:hover:bg-emerald-950/50",
                "text-zinc-400 hover:text-emerald-600",
                "dark:text-zinc-500 dark:hover:text-emerald-400",
                "transition-colors"
              )}
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {invitation.personal_message && (
          <div className="mt-3 ml-14">
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-md p-2">
              "{invitation.personal_message}"
            </p>
          </div>
        )}

        <div className="mt-2 ml-14">
          <p className="text-[12px] text-zinc-400 dark:text-zinc-500">
            Invited {formatTime(invitation.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}

 