"use client"

import { io, type Socket } from "socket.io-client"
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"

// Socket events
export enum SocketEvent {
  CONNECT = "connect",
  DISCONNECT = "disconnect",
  JOIN_TEAM = "join_team",
  LEAVE_TEAM = "leave_team",
  NEW_MESSAGE = "new_message",
  USER_STATUS_CHANGE = "user_status_change",
  TYPING = "typing",
  STOP_TYPING = "stop_typing",
}

// Socket service for real-time communication
class SocketService {
  private socket: Socket | null = null
  private userId: string | null = null
  private initialized = false
  private readonly isDev = process.env.NODE_ENV === 'development'

  // Initialize socket connection
  initialize(userId: string): Socket {
    // If already initialized for this user, return existing socket
    if (this.socket && this.userId === userId) {
      return this.socket
    }

    // Clean up previous connection on user switch
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    this.userId = userId

    const url = process.env.NEXT_PUBLIC_SOCKET_URL || "https://thesisflow-socket-railway.onrender.com"
    const path = process.env.NEXT_PUBLIC_SOCKET_PATH || "/socket.io"

    // Create socket instance but don't auto-connect until we attach auth token
    this.socket = io(url, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      // Use same path as server and prefer websockets to avoid polling 400s/CORS issues
      path,
      transports: ["websocket", "polling"],
      withCredentials: true,
    })

    // Wire up base events once
    if (!this.initialized) {
      this.initialized = true

      this.socket.on(SocketEvent.CONNECT, () => {
        if (this.isDev) console.debug("socket: connected")
        this.updateUserStatus("online")
      })

      this.socket.on(SocketEvent.DISCONNECT, () => {
        if (this.isDev) console.debug("socket: disconnected")
      })

      // Provide detailed diagnostics for connection errors
      this.socket.on("connect_error", (err: any) => {
        if (this.isDev) console.warn("socket: connect_error -", err?.message)
      })
      this.socket.on("error", (err: any) => {
        if (this.isDev) console.warn("socket: error -", err?.message || err)
      })
      this.socket.io.on("reconnect_error", (err: any) => {
        if (this.isDev) console.warn("socket: reconnect_error -", err?.message)
      })

      // Cleanly mark offline on page unload
      if (typeof window !== 'undefined') {
        window.addEventListener("beforeunload", () => {
          this.updateUserStatus("offline")
          this.socket?.disconnect()
        })
      }
    }

    // Fetch Supabase session token and connect
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token
      if (!token) {
        if (this.isDev) console.debug("socket: no Supabase token; delaying connect")
        return
      }
      // Prefer server-trusted user id from session
      const sessionUserId = data.session?.user?.id
      if (sessionUserId) {
        this.userId = sessionUserId
      }
      if (!this.socket) return
      // Attach token for server auth middleware
      ;(this.socket as any).auth = { token }
      try {
        this.socket.connect()
      } catch (e) {
        if (this.isDev) console.warn("socket: connect failed")
      }
    })

    // Also react to auth state changes (refresh tokens, login/logout)
    supabase.auth.onAuthStateChange(async (_event, session) => {
      const token = session?.access_token
      if (!this.socket) return
      if (!token) {
        // Logout: disconnect socket
        this.disconnect()
        return
      }
      if (session?.user?.id) {
        this.userId = session.user.id
      }
      ;(this.socket as any).auth = { token }
      if (this.socket.disconnected) {
        this.socket.connect()
      }
    })

    return this.socket
  }

  // Join a team room to receive team-specific messages
  joinTeam(teamId: string): void {
    if (!this.socket) return
    this.socket.emit(SocketEvent.JOIN_TEAM, { teamId })
  }

  // Leave a team room
  leaveTeam(teamId: string): void {
    if (!this.socket) return
    this.socket.emit(SocketEvent.LEAVE_TEAM, { teamId })
  }

  // Send a new message to a team
  sendMessage(
    teamId: string,
    message: string,
    type: "text" | "system" = "text",
    mentions?: string[]
  ): void {
    if (!this.socket || !this.userId) return

    this.socket.emit(SocketEvent.NEW_MESSAGE, {
      teamId,
      userId: this.userId,
      content: message,
      type,
      mentions: Array.isArray(mentions) ? mentions : undefined,
    })
  }

  // Update user status (online, offline, away)
  async updateUserStatus(status: "online" | "offline" | "away"): Promise<void> {
    if (!this.socket || !this.userId) return

    // Server expects 'update-status' from client; it will broadcast 'user-status-changed'
    this.socket.emit('update-status', status)

    // Also update in Supabase
    try {
      await supabase
        .from("user_profiles")
        .update({
          status,
          last_active: new Date().toISOString(),
        })
        .eq("id", this.userId)
      if (this.isDev) console.debug(`socket: status -> ${status}`)
    } catch (err) {
      console.error("Error updating user status:", err)
    }
  }

  // Notify that user is typing
  startTyping(teamId: string): void {
    if (!this.socket || !this.userId) return

    this.socket.emit(SocketEvent.TYPING, {
      teamId,
      userId: this.userId,
    })
  }

  // Notify that user stopped typing
  stopTyping(teamId: string): void {
    if (!this.socket || !this.userId) return

    this.socket.emit(SocketEvent.STOP_TYPING, {
      teamId,
      userId: this.userId,
    })
  }

  // Add event listener
  on(event: SocketEvent | string, callback: (...args: any[]) => void): void {
    if (!this.socket) return
    this.socket.on(event, callback)
  }

  // Remove event listener
  off(event: SocketEvent | string, callback: (...args: any[]) => void): void {
    if (!this.socket) return
    this.socket.off(event, callback)
  }

  // Connection state helper
  isConnected(): boolean {
    return !!this.socket?.connected
  }

  // Send typing status (alias for startTyping/stopTyping)
  sendTypingStatus(teamId: string, isTyping: boolean): void {
    if (isTyping) {
      this.startTyping(teamId)
    } else {
      this.stopTyping(teamId)
    }
  }

  // Disconnect socket
  disconnect(): void {
    if (this.socket) {
      this.updateUserStatus("offline")
      this.socket.disconnect()
      this.socket = null
      this.userId = null
    }
  }
}

// Create singleton instance
export const socketService = new SocketService()

// React hook for using socket in components
export function useSocket(userId: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    if (!userId) {
      // Clean up socket when user logs out
      socketService.disconnect()
      setSocket(null)
      return
    }

    // Only initialize if not already connected or user changed
    const newSocket = socketService.initialize(userId)
    setSocket(newSocket)

    return () => {
      // Only disconnect if user logs out, not on component unmount
      // This prevents unnecessary disconnections during navigation
    }
  }, [userId]) // Only re-run when userId actually changes

  return socket
}
