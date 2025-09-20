"use client"

import React from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { Plus, Crown, UserPlus, Search as SearchIcon, Users, Globe, MoreHorizontal, Inbox, Sparkles, User as UserIcon, Settings as SettingsIcon } from "lucide-react"
import { TokenMeter } from "@/components/token/token-meter"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { useUserPlan } from "@/hooks/use-user-plan"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type UserStatus = "online" | "offline" | "away" | "busy"

type Member = {
  id: string
  name?: string
  email?: string
  avatar?: string
  status: UserStatus
}

export type TeamSidebarTeam = {
  id: string
  name: string
  description?: string
  isPublic?: boolean
  category?: string
  members: Member[]
  owner?: string
}

export type TeamSidebarProps = {
  teams: TeamSidebarTeam[]
  searchTerm: string
  setSearchTerm: (v: string) => void
  selectedTeamId: string | null
  setSelectedTeamId: (id: string) => void
  canUseTeamMembers: boolean
  planLoading?: boolean
  onCreateTeam: () => void
  onInviteMember: () => void
  onOpenInvitations: () => void
  invitationsCount?: number
}

function getStatusColor(status: UserStatus) {
  switch (status) {
    case "online":
      return "bg-green-500"
    case "away":
      return "bg-yellow-500"
    case "busy":
      return "bg-red-500"
    default:
      return "bg-gray-400"
  }
}

export function TeamSidebar(props: TeamSidebarProps) {
  const {
    teams,
    searchTerm,
    setSearchTerm,
    selectedTeamId,
    setSelectedTeamId,
    canUseTeamMembers,
    planLoading,
    onCreateTeam,
    onInviteMember,
    onOpenInvitations,
    invitationsCount = 0,
  } = props

  const { user, isLoading, signOut } = useSupabaseAuth()
  const { getPlanType, tokenStatus, isProOrHigher } = useUserPlan()

  // Simple avatar used in profile dropdown
  const SimpleAvatar = ({ size = "sm" }: { size?: "sm" | "md" }) => {
    const getInitials = () => {
      if (user?.user_metadata?.display_name) return user.user_metadata.display_name[0].toUpperCase()
      if (user?.email) return user.email[0].toUpperCase()
      return "U"
    }
    const sizeClass = size === "sm" ? "h-8 w-8 text-sm" : "h-10 w-10 text-base"
    const avatarUrl = user?.user_metadata?.avatar_url
    if (avatarUrl) {
      return <img src={`${avatarUrl}?v=${Date.now()}`} alt="Profile" className={`${sizeClass} rounded-full object-cover`} />
    }
    return (
      <div className={`${sizeClass} bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold rounded-full flex items-center justify-center`}>
        {getInitials()}
      </div>
    )
  }

  const filtered = React.useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return teams
    return teams.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.description || "").toLowerCase().includes(q)
    )
  }, [teams, searchTerm])

  const hasSelection = Boolean(selectedTeamId)

  const membersLabel = (count: number) => `${count} ${count === 1 ? "member" : "members"}`

  const getTagStyle = (tag?: string) => {
    const t = (tag || '').toLowerCase()
    if (t.includes('project')) return 'bg-blue-50 text-blue-700 border-blue-200'
    if (t.includes('research')) return 'bg-green-50 text-green-700 border-green-200'
    return 'bg-muted text-foreground border-transparent'
  }

  return (
    <aside className="lg:sticky lg:top-0 space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Your Teams</CardTitle>
            <Badge variant="secondary" className="font-normal">{filtered.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="sticky top-0 z-10 bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/70 px-4 pt-4 pb-3 border-b">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search teams..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-none bg-muted/50 focus:bg-muted/80 transition-colors"
                  />
                </div>
                <DropdownMenu
                  trigger={<Button variant="outline" size="icon" className="shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>}
                  className="w-56"
                  side="bottom"
                  align="end"
                >
                  <DropdownMenuLabel>Team Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => {
                      const disabled = !canUseTeamMembers || Boolean(planLoading)
                      if (disabled) return
                      onCreateTeam()
                    }}
                    className={`${(!canUseTeamMembers || Boolean(planLoading)) ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Team
                    {!canUseTeamMembers && <Crown className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      const disabled = !hasSelection || !canUseTeamMembers || Boolean(planLoading)
                      if (disabled) return
                      onInviteMember()
                    }}
                    className={`${(!hasSelection || !canUseTeamMembers || Boolean(planLoading)) ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Member
                    {!canUseTeamMembers && <Crown className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onOpenInvitations}>
                    <Inbox className="mr-2 h-4 w-4" />
                    Invitations
                    {invitationsCount > 0 && (
                      <Badge variant="secondary" className="ml-auto">{invitationsCount}</Badge>
                    )}
                  </DropdownMenuItem>
                </DropdownMenu>
              </div>
              {/* Mini Token Meter */}
              {user && !isLoading && (
                <div className="mt-3">
                  <TokenMeter compact />
                </div>
              )}
            </div>
            <div className="p-4 space-y-2">
              {filtered.map((team) => (
                <button
                  key={team.id}
                  className={`w-full text-left group p-4 rounded-lg border transition-all duration-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                    selectedTeamId === team.id
                      ? "bg-primary/10 border-primary/30"
                      : "bg-muted/30 hover:bg-muted/50 border-transparent"
                  }`}
                  onClick={() => setSelectedTeamId(team.id)}
                  role="button"
                  aria-pressed={selectedTeamId === team.id}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md ${selectedTeamId === team.id ? "bg-primary/20" : "bg-muted"}`}>
                        <Users className="h-3 w-3" />
                      </div>
                      <h4 className="font-semibold text-sm leading-none">{team.name}</h4>
                    </div>
                    <div className="flex items-center gap-1">
                      {team.isPublic && <Globe className="h-3 w-3 text-muted-foreground" />}
                      {team.category && (
                        <Badge variant="outline" className={`text-xs font-medium ${getTagStyle(team.category)}`}>{team.category}</Badge>
                      )}
                    </div>
                  </div>
                  {/* Lead/Admin line if available */}
                  {(() => {
                    const lead = team.members.find((m: any) => m.role === 'owner' || m.role === 'admin')
                    if (!lead) return null
                    return (
                      <p className="text-[11px] text-muted-foreground mb-1.5">Lead: {lead.name || lead.email}</p>
                    )
                  })()}
                  {team.description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{team.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{membersLabel(team.members.length)}</span>
                    <div className="flex -space-x-1 items-center">
                      {team.members.slice(0, 3).map((m) => (
                        <div key={m.id} className="relative">
                          <Avatar className="h-5 w-5 border border-white">
                            <AvatarImage src={m.avatar || ""} />
                            <AvatarFallback className="text-[10px]">{(m.name || m.email || "U").charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${getStatusColor(m.status)}`} />
                        </div>
                      ))}
                      {team.members.length > 3 && (
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-foreground border">
                          +{team.members.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No teams found</p>
                </div>
              )}
            </div>
            <div className="pointer-events-none sticky bottom-0 h-6 bg-gradient-to-t from-background to-transparent" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Footer with token chip and profile dropdown */}
      {user && !isLoading && (
        <div className="rounded-lg border bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between">
            {/* Token chip */}
            {tokenStatus && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 rounded-full border bg-white px-2 h-7 text-xs">
                      <Sparkles className="h-3.5 w-3.5 text-[#FF6B2C]" />
                      <span className="tabular-nums">{tokenStatus.monthlyRemaining}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Monthly: {tokenStatus.monthlyUsed}/{tokenStatus.monthlyLimit}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <DropdownMenu
              trigger={
                <button className="relative h-9 w-9 rounded-full overflow-hidden border hover:opacity-90">
                  <SimpleAvatar size="sm" />
                </button>
              }
              className="w-56 right-0"
              side="top"
              align="end"
              sideOffset={8}
            >
              <div className="flex items-center justify-start gap-3 p-3 border-b">
                <SimpleAvatar size="md" />
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium text-sm">{user.user_metadata?.full_name || user.user_metadata?.display_name || user.user_metadata?.name || (user.email ? user.email.split("@")[0] : "User")}</p>
                  <p className="w-[180px] truncate text-xs text-gray-600">{user.email}</p>
                </div>
              </div>
              {/* Plan + Usage card */}
              <div className="p-3 border-b">
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">{getPlanType() === 'pro' ? 'Pro Plan' : 'Free Plan'}</span>
                    <span className="inline-flex items-center text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3 mr-1 text-[#FF6B2C]" />
                      {tokenStatus ? `${tokenStatus.monthlyRemaining} left` : '—'}
                    </span>
                  </div>
                  {tokenStatus && (
                    <div className="text-[11px] text-muted-foreground">Monthly: {tokenStatus.monthlyUsed}/{tokenStatus.monthlyLimit}</div>
                  )}
                  <div className="mt-2">
                    <Link href="/plan">
                      <Button variant="outline" size="sm" className="w-full h-7 text-xs">{isProOrHigher() ? 'Manage Plan' : 'Upgrade Plan'}</Button>
                    </Link>
                  </div>
                </div>
              </div>
              <DropdownMenuItem>
                <Link href="/profile" className="flex items-center w-full">
                  <UserIcon className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/settings" className="flex items-center w-full">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/plan" className="flex items-center w-full">
                  <Crown className="mr-2 h-4 w-4" />
                  Plan
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600" onClick={() => signOut()}>
                Logout
              </DropdownMenuItem>
            </DropdownMenu>
          </div>
        </div>
      )}
    </aside>
  )
}

export default TeamSidebar


