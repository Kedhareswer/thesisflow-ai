"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TeamInvitation } from "@/components/ui/team-invitation"
import { Loader2, RefreshCw, UserPlus, Inbox, Send } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

interface InvitationsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiCall: (url: string, options?: RequestInit) => Promise<any>
  user?: {
    id: string
    email?: string
  }
  onJoinedTeam?: (args: { team: { id: string; name: string; description?: string; category?: string; isPublic?: boolean; createdAt?: string; owner?: string }, role: 'viewer' | 'editor' | 'admin' }) => void
}

export function InvitationsDialog({ 
  open, 
  onOpenChange, 
  apiCall,
  user,
  onJoinedTeam
}: InvitationsDialogProps) {
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('received')
  const [details, setDetails] = useState<{ open: boolean; invitation?: any }>({ open: false })
  const { toast } = useToast()

  const fetchInvitations = async () => {
    if (!user || !apiCall) return

    try {
      setLoading(true)
      
      // Fetch all invitations once; tabs filter client-side. Refresh button triggers re-fetch.
      const data = await apiCall(`/api/collaborate/invitations?type=all&status=all`)
      
      if (data.success) {
        setInvitations(data.invitations || [])
      } else {
        throw new Error(data.error || 'Failed to fetch invitations')
      }
    } catch (error) {
      console.error('Error fetching invitations:', error)
      toast({
        title: "Error",
        description: "Failed to fetch invitations",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (invitationId: string) => {
    try {
      const data = await apiCall('/api/collaborate/invitations', {
        method: 'PUT',
        body: JSON.stringify({
          invitationId,
          action: 'accept',
        }),
      })

      if (data.success) {
        // Optimistically mark as accepted locally
        setInvitations(prev => prev.map(inv => inv.id === invitationId ? { ...inv, status: 'accepted' } : inv))

        // Notify parent to add team without extra fetch
        const inv = invitations.find(i => i.id === invitationId)
        if (inv && onJoinedTeam) {
          const t = inv.team || {}
          onJoinedTeam({
            team: {
              id: inv.team_id,
              name: t.name || inv.team_name || 'New Team',
              description: t.description,
              category: t.category,
              isPublic: t.is_public,
              createdAt: inv.created_at,
              owner: inv.inviter_id,
            },
            role: inv.role as 'viewer' | 'editor' | 'admin'
          })
        }

        toast({
          title: "Invitation accepted",
          description: data.message,
        })
        // No fetch here; parent updates teams optimistically
      }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      toast({
        title: "Error",
        description: "Failed to accept invitation",
        variant: "destructive",
      })
    }
  }

  const handleReject = async (invitationId: string) => {
    try {
      const data = await apiCall('/api/collaborate/invitations', {
        method: 'PUT',
        body: JSON.stringify({
          invitationId,
          action: 'reject',
        }),
      })

      if (data.success) {
        toast({
          title: "Invitation rejected",
          description: data.message,
        })
        fetchInvitations()
      }
    } catch (error) {
      console.error('Error rejecting invitation:', error)
      toast({
        title: "Error", 
        description: "Failed to reject invitation",
        variant: "destructive",
      })
    }
  }

  const handleCancel = async (invitationId: string) => {
    try {
      const data = await apiCall('/api/collaborate/invitations', {
        method: 'PUT',
        body: JSON.stringify({
          invitationId,
          action: 'cancel',
        }),
      })

      if (data.success) {
        toast({
          title: "Invitation cancelled",
          description: data.message,
        })
        fetchInvitations()
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      toast({
        title: "Error", 
        description: "Failed to cancel invitation",
        variant: "destructive",
      })
    }
  }

  // Auto-fetch once when dialog opens
  useEffect(() => {
    if (open) {
      fetchInvitations()
    }
  }, [open])

  // Filter invitations for received/sent/all tabs
  const receivedInvitations = invitations.filter(inv => 
    (inv.invitee_id === user?.id || inv.invitee_email === user?.email || inv.invited_email === user?.email) &&
    inv.status === 'pending'
  )
  
  const sentInvitations = invitations.filter(inv => inv.inviter_id === user?.id)

  const currentInvitations = activeTab === 'received' ? receivedInvitations : 
                            activeTab === 'sent' ? sentInvitations : 
                            invitations

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="pr-12">
          <DialogTitle className="flex items-center justify-between pr-2">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Team Collaboration Invitations
            </div>
            <div className="flex items-center gap-2">
            <Button
              onClick={fetchInvitations}
              variant="outline"
              size="sm"
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="received" className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              Received
              {receivedInvitations.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {receivedInvitations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Sent
              {sentInvitations.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {sentInvitations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              All
              {invitations.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {invitations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Loading invitations...</span>
              </div>
            ) : currentInvitations.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {activeTab === 'received' ? 'No invitations received' : 
                   activeTab === 'sent' ? 'No invitations sent' : 
                   'No invitations'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {activeTab === 'received' ? 'Team collaboration invitations you receive will appear here' : 
                   activeTab === 'sent' ? 'Team collaboration invitations you send will appear here' : 
                   'All team collaboration invitations will appear here'}
                </p>
                <Button 
                  onClick={fetchInvitations}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Load Invitations
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {currentInvitations.map((invitation) => (
                  <TeamInvitation
                    key={invitation.id}
                    invitation={{
                      id: invitation.id,
                      team_name: invitation.team?.name || invitation.team_name,
                      inviter_name: invitation.inviter?.full_name || invitation.inviter_name,
                      inviter_email: invitation.inviter?.email || invitation.inviter_email,
                      inviter_avatar: invitation.inviter?.avatar_url || invitation.inviter_avatar,
                      invitee_name: invitation.invitee?.full_name || invitation.invitee_name,
                      invitee_email: invitation.invitee_email || invitation.invited_email,
                      invitee_avatar: invitation.invitee?.avatar_url || invitation.invitee_avatar,
                      role: invitation.role,
                      status: invitation.status,
                      created_at: invitation.created_at
                    }}
                    context={activeTab === 'sent' ? 'sent' : 'received'}
                    onAccept={() => handleAccept(invitation.id)}
                    onReject={() => handleReject(invitation.id)}
                    onCancel={() => handleCancel(invitation.id)}
                    onClick={() => setDetails({ open: true, invitation })}
                  />
                ))}
              </div>
            )}
          </div>
        </Tabs>
        <Dialog open={details.open} onOpenChange={(o) => setDetails(o ? details : { open: false })}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Invitation Details</DialogTitle>
            </DialogHeader>
            {details.invitation && (
              <div className="text-sm space-y-2">
                <div><span className="text-muted-foreground">Team:</span> {details.invitation.team?.name || '—'}</div>
                <div><span className="text-muted-foreground">Inviter:</span> {details.invitation.inviter?.full_name || details.invitation.inviter_email || '—'}</div>
                <div><span className="text-muted-foreground">Invitee:</span> {details.invitation.invitee?.full_name || details.invitation.invitee_email || details.invitation.invited_email || '—'}</div>
                <div><span className="text-muted-foreground">Role:</span> {details.invitation.role}</div>
                <div><span className="text-muted-foreground">Status:</span> {details.invitation.status}</div>
                <div><span className="text-muted-foreground">Sent:</span> {new Date(details.invitation.created_at).toLocaleString()}</div>
                {details.invitation.personal_message && (
                  <div className="pt-2"><span className="text-muted-foreground">Message:</span> {details.invitation.personal_message}</div>
                )}
                <div className="pt-3 flex items-center justify-end gap-2">
                  {details.invitation.status === 'pending' && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => { setDetails({ open: false }); handleReject(details.invitation.id) }}>Reject</Button>
                      <Button size="sm" onClick={() => { setDetails({ open: false }); handleAccept(details.invitation.id) }}>Accept</Button>
                    </>
                  )}
                  {details.invitation.status === 'pending' && (details.invitation.inviter_id === user?.id) && (
                    <Button variant="destructive" size="sm" onClick={() => { setDetails({ open: false }); handleCancel(details.invitation.id) }}>Cancel</Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
