"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Users, Circle, MessageSquare } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export interface CollaboratorUser {
  id: string
  name: string
  email: string
  avatar?: string
  color: string
  cursor_position?: number
  is_active: boolean
  last_seen: string
  current_section?: string
}

interface CollaborativePresenceProps {
  documentId?: string
  currentUserId: string
  onOpenComments?: () => void
  className?: string
}

// Predefined colors for user cursors
const USER_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
  "#F8B500",
  "#50C878",
]

export function CollaborativePresence({ documentId, currentUserId, onOpenComments, className }: CollaborativePresenceProps) {
  const [collaborators, setCollaborators] = useState<CollaboratorUser[]>([])
  const [unreadComments, setUnreadComments] = useState(3) // Mock data

  // Mock data for demonstration - replace with WebSocket integration
  useEffect(() => {
    const mockCollaborators: CollaboratorUser[] = [
      {
        id: currentUserId,
        name: "You",
        email: "you@example.com",
        color: USER_COLORS[0],
        cursor_position: 150,
        is_active: true,
        last_seen: new Date().toISOString(),
        current_section: "Introduction",
      },
      {
        id: "user-2",
        name: "John Doe",
        email: "john@example.com",
        avatar: undefined,
        color: USER_COLORS[1],
        cursor_position: 450,
        is_active: true,
        last_seen: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        current_section: "Methodology",
      },
      {
        id: "user-3",
        name: "Jane Smith",
        email: "jane@example.com",
        avatar: undefined,
        color: USER_COLORS[2],
        cursor_position: 800,
        is_active: true,
        last_seen: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
        current_section: "Results",
      },
      {
        id: "user-4",
        name: "Bob Wilson",
        email: "bob@example.com",
        avatar: undefined,
        color: USER_COLORS[3],
        is_active: false,
        last_seen: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      },
    ]

    setCollaborators(mockCollaborators)

    // Simulate real-time updates
    const interval = setInterval(() => {
      setCollaborators((prev) =>
        prev.map((user) => ({
          ...user,
          cursor_position: user.is_active && user.id !== currentUserId
            ? (user.cursor_position || 0) + Math.floor(Math.random() * 50) - 25
            : user.cursor_position,
        }))
      )
    }, 3000)

    return () => clearInterval(interval)
  }, [currentUserId, documentId])

  const activeCollaborators = collaborators.filter((c) => c.is_active)
  const inactiveCollaborators = collaborators.filter((c) => !c.is_active)

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Active collaborators avatars */}
      <TooltipProvider>
        <div className="flex items-center -space-x-2">
          {activeCollaborators.slice(0, 4).map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar
                    className="h-8 w-8 border-2 border-white ring-2"
                    style={{ ringColor: user.color }}
                  >
                    {user.avatar ? (
                      <AvatarImage src={user.avatar} alt={user.name} />
                    ) : (
                      <AvatarFallback
                        style={{ backgroundColor: user.color }}
                        className="text-white text-xs font-semibold"
                      >
                        {getInitials(user.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {user.is_active && (
                    <Circle
                      className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-green-500 fill-green-500"
                      strokeWidth={2}
                    />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div className="space-y-1">
                  <p className="font-semibold">{user.name}</p>
                  {user.current_section && (
                    <p className="text-gray-500">Editing: {user.current_section}</p>
                  )}
                  <p className="text-gray-400">
                    {user.is_active ? "Active now" : `Last seen ${formatDistanceToNow(new Date(user.last_seen), { addSuffix: true })}`}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          {activeCollaborators.length > 4 && (
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 border-2 border-white text-xs font-semibold text-gray-600">
              +{activeCollaborators.length - 4}
            </div>
          )}
        </div>
      </TooltipProvider>

      {/* Collaborators count */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="text-sm text-gray-600 hover:text-gray-900">
            <Users className="h-4 w-4 mr-1" />
            {activeCollaborators.length}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Active Collaborators ({activeCollaborators.length})</h4>
              <div className="space-y-2">
                {activeCollaborators.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 py-2">
                    <Avatar className="h-8 w-8">
                      {user.avatar ? (
                        <AvatarImage src={user.avatar} alt={user.name} />
                      ) : (
                        <AvatarFallback
                          style={{ backgroundColor: user.color }}
                          className="text-white text-xs font-semibold"
                        >
                          {getInitials(user.name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                      {user.current_section && (
                        <p className="text-xs text-gray-500 truncate">Editing: {user.current_section}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{ borderColor: user.color, color: user.color }}
                    >
                      <Circle className="h-2 w-2 mr-1 fill-current" />
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {inactiveCollaborators.length > 0 && (
              <>
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-2">Offline ({inactiveCollaborators.length})</h4>
                  <div className="space-y-2">
                    {inactiveCollaborators.map((user) => (
                      <div key={user.id} className="flex items-center gap-3 py-2">
                        <Avatar className="h-8 w-8 opacity-50">
                          {user.avatar ? (
                            <AvatarImage src={user.avatar} alt={user.name} />
                          ) : (
                            <AvatarFallback className="bg-gray-300 text-gray-600 text-xs font-semibold">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-600 truncate">{user.name}</p>
                          <p className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(user.last_seen), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Comments button */}
      {onOpenComments && (
        <Button
          variant="ghost"
          size="sm"
          className="text-sm text-gray-600 hover:text-gray-900 relative"
          onClick={onOpenComments}
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          Comments
          {unreadComments > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadComments}
            </Badge>
          )}
        </Button>
      )}
    </div>
  )
}

// Cursor overlay component to show other users' cursors in the editor
export function CursorOverlay({ collaborators, currentUserId }: { collaborators: CollaboratorUser[]; currentUserId: string }) {
  const otherUsers = collaborators.filter((c) => c.id !== currentUserId && c.is_active && c.cursor_position !== undefined)

  return (
    <div className="pointer-events-none absolute inset-0">
      {otherUsers.map((user) => (
        <div
          key={user.id}
          className="absolute transition-all duration-300 ease-out"
          style={{
            top: `${((user.cursor_position || 0) / 1000) * 100}%`,
            left: "0",
          }}
        >
          <div className="flex items-center gap-1">
            <div
              className="h-5 w-0.5"
              style={{ backgroundColor: user.color }}
            />
            <div
              className="px-2 py-0.5 rounded text-xs font-semibold text-white whitespace-nowrap"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
