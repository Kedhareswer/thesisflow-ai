"use client"

import { useSocket } from "@/components/socket-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Plus, UserPlus } from "lucide-react"
import { PermissionRole, Collaborator, PendingInvite } from "@/app/writing-assistant/permissions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type CollaboratorsListProps = {
  collaborators?: Collaborator[];
  pendingInvites?: PendingInvite[];
  onRoleChange?: (collabId: string, newRole: PermissionRole) => void;
  onResendInvite?: (inviteId: string) => void;
  onRevokeInvite?: (inviteId: string) => void;
};

const roleLabels: Record<PermissionRole, string> = {
  owner: "Owner",
  editor: "Editor",
  commenter: "Commenter",
  viewer: "Viewer"
};

const statusColor: Record<string, string> = {
  online: "bg-green-500",
  away: "bg-yellow-400",
  offline: "bg-gray-400"
};

export default function CollaboratorsList({
  collaborators,
  pendingInvites,
  onRoleChange,
  onResendInvite,
  onRevokeInvite
}: CollaboratorsListProps = {}) {
  const { socket, activeUsers } = useSocket()
  const { toast } = useToast()
  const [inviteEmail, setInviteEmail] = useState("")

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim() || !socket) return

    try {
      socket.emit("invite_collaborator", { email: inviteEmail })
      setInviteEmail("")
      toast({
        title: "Invitation Sent",
        description: "An invitation has been sent to " + inviteEmail,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Use props if provided, else fallback to activeUsers (convert User to Collaborator)
  let collabs: Collaborator[] = [];
  if (collaborators) {
    collabs = collaborators;
  } else if (activeUsers) {
    collabs = activeUsers.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email || "",
      avatar: u.avatar,
      status: u.status,
      role: u.role || "viewer",
      isTyping: u.isTyping
    }));
  }
  const invites: PendingInvite[] = pendingInvites || [];

  const handleRoleChange = (id: string, newRole: PermissionRole) => {
    if (onRoleChange) onRoleChange(id, newRole);
    // Optionally emit socket event here
    if (socket) socket.emit("change_collaborator_role", { id, role: newRole });
  };

  const handleResend = (id: string) => {
    if (onResendInvite) onResendInvite(id);
    // Optionally emit socket event here
    if (socket) socket.emit("resend_invite", { id });
    toast({ title: "Invite resent" });
  };

  const handleRevoke = (id: string) => {
    if (onRevokeInvite) onRevokeInvite(id);
    // Optionally emit socket event here
    if (socket) socket.emit("revoke_invite", { id });
    toast({ title: "Invite revoked" });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleInvite} className="flex gap-2">
        <Input
          type="email"
          placeholder="Invite by email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          className="flex-1"
        />
        <Button type="submit">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite
        </Button>
      </form>

      <div className="space-y-2">
        {activeUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
          >
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={user.avatar} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user.name}</p>
                <Badge
                  variant={user.status === "online" ? "default" : "secondary"}
                  className="mt-1"
                >
                  {user.status}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 