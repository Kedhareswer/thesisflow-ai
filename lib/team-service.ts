import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export interface Team {
  id: string
  name: string
  description: string
  members: TeamMember[]
  createdAt: Date
  createdBy: string
  projects: string[]
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: "owner" | "admin" | "member" | "viewer"
  joinedAt: Date
  avatar?: string
  status: "active" | "inactive" | "pending"
}

export interface TeamInvitation {
  id: string
  teamId: string
  email: string
  role: TeamMember["role"]
  invitedBy: string
  invitedAt: Date
  status: "pending" | "accepted" | "declined" | "expired"
}

export class TeamService {
  private static teams: Team[] = []
  private static invitations: TeamInvitation[] = []

  static async createTeam(name: string, description: string, createdBy: string): Promise<Team> {
    const team: Team = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      description,
      members: [
        {
          id: createdBy,
          name: "Team Creator",
          email: "creator@example.com",
          role: "owner",
          joinedAt: new Date(),
          status: "active",
        },
      ],
      createdAt: new Date(),
      createdBy,
      projects: [],
    }

    this.teams.push(team)
    return team
  }

  static getTeams(userId: string): Team[] {
    return this.teams.filter((team) => team.members.some((member) => member.id === userId))
  }

  static getTeam(teamId: string): Team | undefined {
    return this.teams.find((team) => team.id === teamId)
  }

  static async inviteMember(
    teamId: string,
    email: string,
    role: TeamMember["role"],
    invitedBy: string,
  ): Promise<TeamInvitation> {
    const invitation: TeamInvitation = {
      id: Math.random().toString(36).substr(2, 9),
      teamId,
      email,
      role,
      invitedBy,
      invitedAt: new Date(),
      status: "pending",
    }

    this.invitations.push(invitation)

    // In a real app, send email invitation
    console.log(`Invitation sent to ${email} for team ${teamId}`)

    return invitation
  }

  static async acceptInvitation(invitationId: string, userId: string, userName: string): Promise<void> {
    const invitation = this.invitations.find((inv) => inv.id === invitationId)
    if (!invitation || invitation.status !== "pending") {
      throw new Error("Invalid or expired invitation")
    }

    const team = this.getTeam(invitation.teamId)
    if (!team) {
      throw new Error("Team not found")
    }

    // Add member to team
    const newMember: TeamMember = {
      id: userId,
      name: userName,
      email: invitation.email,
      role: invitation.role,
      joinedAt: new Date(),
      status: "active",
    }

    team.members.push(newMember)
    invitation.status = "accepted"
  }

  static async removeMember(teamId: string, memberId: string, removedBy: string): Promise<void> {
    const team = this.getTeam(teamId)
    if (!team) {
      throw new Error("Team not found")
    }

    const remover = team.members.find((m) => m.id === removedBy)
    if (!remover || (remover.role !== "owner" && remover.role !== "admin")) {
      throw new Error("Insufficient permissions")
    }

    team.members = team.members.filter((member) => member.id !== memberId)
  }

  static async updateMemberRole(
    teamId: string,
    memberId: string,
    newRole: TeamMember["role"],
    updatedBy: string,
  ): Promise<void> {
    const team = this.getTeam(teamId)
    if (!team) {
      throw new Error("Team not found")
    }

    const updater = team.members.find((m) => m.id === updatedBy)
    if (!updater || updater.role !== "owner") {
      throw new Error("Only team owners can update member roles")
    }

    const member = team.members.find((m) => m.id === memberId)
    if (member) {
      member.role = newRole
    }
  }

  static getTeamInvitations(teamId: string): TeamInvitation[] {
    return this.invitations.filter((inv) => inv.teamId === teamId)
  }

  static getUserInvitations(email: string): TeamInvitation[] {
    return this.invitations.filter((inv) => inv.email === email && inv.status === "pending")
  }
}

export interface TeamMember {
  id: string
  email: string
  name: string
  role: "owner" | "admin" | "member" | "viewer"
  joinedAt: Date
  avatar?: string
  status: "active" | "inactive" | "pending"
}

export async function getTeamMembers() {
  const { data, error } = await supabase.from("team_members").select("*").order("created_at", { ascending: true })

  if (error) throw error
  return data as TeamMember[]
}

export async function inviteTeamMember(email: string, role: TeamMember["role"]) {
  const { data, error } = await supabase
    .from("team_members")
    .insert([
      {
        email,
        role,
        status: "pending",
      },
    ])
    .select()
    .single()

  if (error) throw error

  // Here you would typically also send an email invitation
  // using your email service of choice

  return data
}

export async function updateTeamMember(id: string, updates: Partial<TeamMember>) {
  const { data, error } = await supabase.from("team_members").update(updates).eq("id", id).select().single()

  if (error) throw error
  return data as TeamMember
}

export async function removeTeamMember(id: string) {
  const { error } = await supabase.from("team_members").delete().eq("id", id)

  if (error) throw error
}
