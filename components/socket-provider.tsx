"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { io, Socket } from "socket.io-client"

export interface User {
  id: string
  name: string
  avatar?: string
  status: "online" | "offline" | "idle"
}

export interface Event {
  type: "paper_summarized" | "idea_generated" | "collaborator_joined" | "document_edited" | "document_shared" | "chat_message" | "ai_prompt" | "collaboration_session"
  userId: string
  timestamp: string
  payload: Record<string, any>
}

interface SocketEvent {
  type: string;
  payload: Record<string, unknown>;
}

interface SocketContextType {
  socket: Socket | null
  events: SocketEvent[]
  activeUsers: User[]
  isConnected: boolean
  sendEvent: (eventType: string, payload: Record<string, unknown>) => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [events, setEvents] = useState<SocketEvent[]>([])
  const [activeUsers, setActiveUsers] = useState<User[]>([])
  const [isConnected, setIsConnected] = useState(false)

  const sendEvent = (eventType: string, payload: Record<string, unknown>) => {
    if (!socket) return
    const eventWithTimestamp = {
      type: eventType,
      userId: "user-1", // Default user ID, should be replaced with actual user ID
      payload,
      timestamp: new Date().toISOString()
    }
    socket.emit('event', eventWithTimestamp)
    setEvents(prev => [...prev, eventWithTimestamp as SocketEvent])
  }

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
      autoConnect: true,
      reconnection: true,
    })

    socketInstance.on("connect", () => {
      setIsConnected(true)
      console.log("Connected to socket server")
    })

    socketInstance.on("disconnect", () => {
      setIsConnected(false)
      console.log("Disconnected from socket server")
    })

    socketInstance.on("users", (users: User[]) => {
      setActiveUsers(users)
    })

    socketInstance.on("event", (event: Event) => {
      setEvents((prev) => [...prev, event as SocketEvent])
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket, events, activeUsers, isConnected, sendEvent }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider")
  }
  return context
}
