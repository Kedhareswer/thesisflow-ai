'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Send, 
  UserPlus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Mail,
  Users,
  Shield,
  Eye,
  Edit3
} from 'lucide-react'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'

interface Invitation {
  id: string
  team: {
    id: string
    name: string
    description?: string
    is_public: boolean
    category: string
  }
  inviter_id?: string
  invitee_id?: string
  inviter?: {
    id: string
    full_name: string
    avatar_url?: string
  }
  invitee?: {
    id: string
    full_name: string
    avatar_url?: string
  }
  invitee_email: string
  role: 'viewer' | 'editor' | 'admin'
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled'
  personal_message?: string
  created_at: string
  expires_at: string
}

interface InvitationManagerProps {
  teamId: string
  teamName: string
  userRole: string
  userId: string
}

export default function InvitationManager({ teamId, teamName, userRole, userId }: InvitationManagerProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingInvite, setSendingInvite] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [responseDialog, setResponseDialog] = useState<{ open: boolean; invitation?: Invitation; action?: 'accept' | 'reject' }>({ open: false })
  const { toast } = useToast()
  const { session, user } = useSupabaseAuth()
  const effectiveUserId = user?.id || userId

  // Form state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'viewer' as 'viewer' | 'editor' | 'admin',
    message: ''
  })

  // Check if user can send invitations
  const canInvite = userRole === 'owner' || userRole === 'admin'
  const canAssignAdmin = userRole === 'owner'

  // Authenticated API helper
  const apiCall = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!session?.access_token) {
      throw new Error('Authentication required')
    }

    const res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        ...options.headers,
      },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Network error' }))
      throw new Error(err.error || `HTTP ${res.status}`)
    }

    return res.json()
  }, [session?.access_token])

  // Fetch invitations
  const fetchInvitations = async () => {
    try {
      setLoading(true)
      const data = await apiCall(`/api/collaborate/invitations?type=all&status=all`)
      setInvitations(data.invitations || [])
    } catch (error) {
      console.error('Error fetching invitations:', error)
      toast({
        title: 'Error',
        description: 'Failed to load invitations',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvitations()
    // Refresh every 30 seconds
    const interval = setInterval(fetchInvitations, 30000)
    return () => clearInterval(interval)
  }, [teamId])

  // Send invitation
  const sendInvitation = async () => {
    if (!inviteForm.email.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive'
      })
      return
    }

    try {
      setSendingInvite(true)
      const data = await apiCall('/api/collaborate/invitations', {
        method: 'POST',
        body: JSON.stringify({
          teamId,
          inviteeEmail: inviteForm.email.trim(),
          role: inviteForm.role,
          personalMessage: inviteForm.message.trim()
        })
      })

      toast({
        title: 'Success',
        description: data.message || 'Invitation sent successfully'
      })

      // Reset form and close dialog
      setInviteForm({ email: '', role: 'viewer', message: '' })
      setShowInviteDialog(false)
      
      // Refresh invitations
      fetchInvitations()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive'
      })
    } finally {
      setSendingInvite(false)
    }
  }

  // Handle invitation response
  const handleInvitationResponse = async (invitationId: string, action: 'accept' | 'reject' | 'cancel', response?: string) => {
    try {
      const data = await apiCall('/api/collaborate/invitations', {
        method: 'PUT',
        body: JSON.stringify({
          invitationId,
          action,
          response
        })
      })

      toast({
        title: 'Success',
        description: data.message
      })

      // Close dialog and refresh
      setResponseDialog({ open: false })
      fetchInvitations()

      // If accepted, potentially redirect to team
      if (action === 'accept') {
        window.location.href = `/collaborate?team=${data.teamId || invitationId}`
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  // Filter invitations
  const sentInvitations = invitations.filter(inv => (inv.inviter?.id === effectiveUserId || inv.inviter_id === effectiveUserId) && inv.team.id === teamId)
  const receivedInvitations = invitations.filter(inv => (inv.invitee?.id === effectiveUserId || inv.invitee_id === effectiveUserId))
  const teamInvitations = invitations.filter(inv => inv.team.id === teamId)

  // Render role icon
  const RoleIcon = ({ role }: { role: string }) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />
      case 'editor':
        return <Edit3 className="w-4 h-4" />
      default:
        return <Eye className="w-4 h-4" />
    }
  }

  // Render status badge
  const StatusBadge = ({ status }: { status: string }) => {
    const config = {
      pending: { variant: 'secondary' as const, icon: Clock, label: 'Pending' },
      accepted: { variant: 'default' as const, icon: CheckCircle, label: 'Accepted' },
      rejected: { variant: 'destructive' as const, icon: XCircle, label: 'Rejected' },
      expired: { variant: 'outline' as const, icon: AlertCircle, label: 'Expired' },
      cancelled: { variant: 'outline' as const, icon: XCircle, label: 'Cancelled' }
    }

    const { variant, icon: Icon, label } = config[status as keyof typeof config] || config.pending

    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with invite button */}
      {canInvite && (
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Team Invitations</h3>
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite to {teamName}</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your team. You can invite up to 2 teams per day.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select 
                    value={inviteForm.role} 
                    onValueChange={(value) => setInviteForm({ ...inviteForm, role: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          Viewer - Can view content
                        </div>
                      </SelectItem>
                      <SelectItem value="editor">
                        <div className="flex items-center gap-2">
                          <Edit3 className="w-4 h-4" />
                          Editor - Can edit content
                        </div>
                      </SelectItem>
                      {canAssignAdmin && (
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Admin - Can manage team
                          </div>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Personal Message (Optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Add a personal message to your invitation..."
                    value={inviteForm.message}
                    onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={sendInvitation} disabled={sendingInvite}>
                  {sendingInvite ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Invitations tabs */}
      <Tabs defaultValue="received" className="w-full">
        <TabsList className={`grid w-full ${canInvite ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="received" className="relative">
            Received
            {receivedInvitations.filter(i => i.status === 'pending').length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 justify-center">
                {receivedInvitations.filter(i => i.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          {canInvite && <TabsTrigger value="team">Team</TabsTrigger>}
        </TabsList>

        {/* Received Invitations */}
        <TabsContent value="received" className="space-y-4">
          {receivedInvitations.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No invitations received</p>
              </CardContent>
            </Card>
          ) : (
            receivedInvitations.map((invitation) => (
              <Card key={invitation.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <Avatar>
                        <AvatarImage src={invitation.inviter?.avatar_url} />
                        <AvatarFallback>
                          {invitation.inviter?.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="space-y-1">
                        <p className="font-medium">
                          {invitation.inviter?.full_name || 'Someone'} invited you to join
                        </p>
                        <p className="text-lg font-semibold">{invitation.team.name}</p>
                        {invitation.team.description && (
                          <p className="text-sm text-muted-foreground">{invitation.team.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <RoleIcon role={invitation.role} />
                            {invitation.role}
                          </span>
                          <span>•</span>
                          <span>{new Date(invitation.created_at).toLocaleDateString()}</span>
                        </div>

                        {invitation.personal_message && (
                          <Alert className="mt-2">
                            <AlertDescription>
                              "{invitation.personal_message}"
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={invitation.status} />
                      
                      {invitation.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setResponseDialog({ 
                              open: true, 
                              invitation, 
                              action: 'reject' 
                            })}
                          >
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleInvitationResponse(invitation.id, 'accept')}
                          >
                            Accept
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Sent Invitations */}
        <TabsContent value="sent" className="space-y-4">
          {sentInvitations.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Send className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No invitations sent</p>
              </CardContent>
            </Card>
          ) : (
            sentInvitations.map((invitation) => (
              <Card key={invitation.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{invitation.invitee_email}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <RoleIcon role={invitation.role} />
                          {invitation.role}
                        </span>
                        <span>•</span>
                        <span>{new Date(invitation.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={invitation.status} />
                      {invitation.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleInvitationResponse(invitation.id, 'cancel')}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Team Invitations (for admins) */}
        {canInvite && (
          <TabsContent value="team" className="space-y-4">
            {teamInvitations.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No team invitations</p>
                </CardContent>
              </Card>
            ) : (
              teamInvitations.map((invitation) => (
                <Card key={invitation.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {invitation.inviter?.full_name} invited {invitation.invitee_email}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <RoleIcon role={invitation.role} />
                            {invitation.role}
                          </span>
                          <span>•</span>
                          <span>{new Date(invitation.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <StatusBadge status={invitation.status} />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        )}

        {/* All Invitations (account-wide) */}
        <TabsContent value="all" className="space-y-4">
          {invitations.filter(inv => (
            inv.invitee_id === effectiveUserId || inv.inviter_id === effectiveUserId ||
            inv.invitee?.id === effectiveUserId || inv.inviter?.id === effectiveUserId
          )).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No invitations</p>
              </CardContent>
            </Card>
          ) : (
            invitations
              .filter(inv => (
                inv.invitee_id === effectiveUserId || inv.inviter_id === effectiveUserId ||
                inv.invitee?.id === effectiveUserId || inv.inviter?.id === effectiveUserId
              ))
              .map((invitation) => (
                <Card key={invitation.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {(invitation.inviter_id === effectiveUserId || invitation.inviter?.id === effectiveUserId)
                            ? 'You invited'
                            : 'Invited you'} {invitation.invitee_email}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{invitation.team?.name || 'Team'}</span>
                          <span>•</span>
                          <span>{new Date(invitation.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <StatusBadge status={invitation.status} />
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>
      </Tabs>

      {/* Response Dialog */}
      <Dialog open={responseDialog.open} onOpenChange={(open) => setResponseDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {responseDialog.action === 'reject' ? 'Decline Invitation' : 'Accept Invitation'}
            </DialogTitle>
            <DialogDescription>
              {responseDialog.action === 'reject' 
                ? 'Are you sure you want to decline this invitation?'
                : `You will join ${responseDialog.invitation?.team.name} as ${responseDialog.invitation?.role}`
              }
            </DialogDescription>
          </DialogHeader>

          {responseDialog.action === 'reject' && (
            <div className="py-4">
              <Label htmlFor="response">Message (Optional)</Label>
              <Textarea
                id="response"
                placeholder="Let them know why you're declining..."
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setResponseDialog({ open: false })}>
              Cancel
            </Button>
            <Button
              variant={responseDialog.action === 'reject' ? 'destructive' : 'default'}
              onClick={() => {
                const textarea = document.getElementById('response') as HTMLTextAreaElement
                const response = textarea?.value || undefined
                handleInvitationResponse(
                  responseDialog.invitation!.id,
                  responseDialog.action!,
                  response
                )
              }}
            >
              {responseDialog.action === 'reject' ? 'Decline' : 'Accept'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
