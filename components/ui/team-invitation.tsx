import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import Image from "next/image";

interface BaseInvitation {
  id: string;
  team_name: string;
  role: string;
  status: string;
  created_at: string;
  inviter_name?: string;
  inviter_email?: string;
  inviter_avatar?: string;
  invitee_name?: string;
  invitee_email?: string;
  invitee_avatar?: string;
}

interface TeamInvitationProps {
  invitation: BaseInvitation;
  context?: "received" | "sent"; // determines copy and which avatar/name to show
  onAccept?: (invitationId: string) => void;
  onReject?: (invitationId: string) => void;
  onCancel?: (invitationId: string) => void;
  onClick?: () => void;
  className?: string;
}

export function TeamInvitation({ 
  invitation, 
  context = "received",
  onAccept, 
  onReject, 
  onCancel,
  onClick,
  className 
}: TeamInvitationProps) {
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

  const isSent = context === 'sent';
  const displayName = isSent
    ? (invitation.invitee_name || invitation.invitee_email || "User")
    : (invitation.inviter_name || invitation.inviter_email || "User");
  const avatarSrc = isSent
    ? (invitation.invitee_avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face")
    : (invitation.inviter_avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face");

  return (
    <div className={cn("w-full max-w-xl mx-auto", className)}>
      <div
        className="relative bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-[0_1px_6px_0_rgba(0,0,0,0.02)] rounded-xl p-4 cursor-pointer hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 transition-colors"
        onClick={onClick}
      >
        <div className="flex items-center gap-4">
          <div className="relative h-10 w-10 flex-shrink-0">
            <Image
              src={avatarSrc}
              alt={displayName}
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
                  {isSent ? (
                    <>
                      You invited {displayName} to join{" "}
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {invitation.team_name}
                      </span>
                      {" "}as {invitation.role}
                    </>
                  ) : (
                    <>
                      {displayName} invited you to join{" "}
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {invitation.team_name}
                      </span>
                      {" "}as {invitation.role}
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
          {invitation.status === 'pending' && !isSent && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onReject?.(invitation.id) }}
                className="rounded-lg flex items-center justify-center h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-950/50 text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onAccept?.(invitation.id) }}
                className={cn(
                  "rounded-lg flex items-center justify-center h-8 w-8 p-0",
                  "hover:bg-emerald-50 dark:hover:bg-emerald-950/50",
                  "text-zinc-400 hover:text-emerald-600",
                  "dark:text-zinc-500 dark:hover:text-emerald-400",
                  "transition-colors"
                )}
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          )}
          {invitation.status === 'pending' && isSent && onCancel && (
            <div className="ml-auto">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCancel?.(invitation.id) }}
                className="text-xs px-2 py-1 rounded-md text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:text-zinc-400 dark:hover:text-red-400 dark:hover:bg-red-950/40 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="mt-2 ml-14">
          <p className="text-[12px] text-zinc-400 dark:text-zinc-500">
            Invited {formatTime(invitation.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}

 