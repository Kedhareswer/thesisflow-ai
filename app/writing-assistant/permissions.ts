// Permission roles for collaboration
export type PermissionRole = "owner" | "editor" | "commenter" | "viewer";

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: "online" | "offline" | "away";
  role: PermissionRole;
  isTyping?: boolean;
  pending?: boolean;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: PermissionRole;
  invitedAt: string;
}
