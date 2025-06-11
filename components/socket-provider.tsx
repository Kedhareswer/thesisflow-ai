"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { Socket } from "socket.io-client"

// Export the Event interface that was missing
export interface Event {
  type:
    | "paper_summarized"
    | "idea_generated"
    | "collaborator_joined"
    | "document_edited"
    | "document_shared"
    | "chat_message"
    | "ai_prompt"
    | "collaboration_session"
  userId: string
  timestamp: string
  payload: Record<string, any>
}

// Export the User interface
export interface User {
  id: string
  name: string
  avatar?: string
  status: "online" | "offline" | "idle"
}

interface SocketEvent {
  type: string
  payload: Record<string, unknown>
  timestamp: Date
}

interface SocketContextType {
  socket: Socket | null
  activeUsers: User[]
  events: SocketEvent[]
  isConnected: boolean
  sendEvent: (eventType: string, payload: Record<string, unknown>) => void
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  activeUsers: [],
  events: [],
  isConnected: false,
  sendEvent: () => {},
})

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [activeUsers, setActiveUsers] = useState<User[]>([])
  const [events, setEvents] = useState<SocketEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)

  const sendEvent = (eventType: string, payload: Record<string, unknown>) => {
    if (!socket) return

    const eventWithTimestamp: SocketEvent = {
      type: eventType,
      payload,
      timestamp: new Date(),
    }

    // Emit to socket server
    socket.emit("event", {
      type: eventType,
      userId: "user-1", // This should be replaced with actual user ID
      payload,
      timestamp: new Date().toISOString(),
    })

    // Add to local events
    setEvents((prev) => [...prev, eventWithTimestamp])
  }

  useEffect(() => {
    // In a real app, connect to your socket server
    // const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001')

    // For demo purposes, create a mock socket
    const mockSocket = {
      emit: (event: string, data: any) => {
        console.log("Socket emit:", event, data)
      },
      on: (event: string, callback: Function) => {
        console.log("Socket listener added for:", event)
      },
      off: (event: string, callback?: Function) => {
        console.log("Socket listener removed for:", event)
      },
      disconnect: () => {
        console.log("Socket disconnected")
        setIsConnected(false)
      },
    }

    setSocket(mockSocket as any)
    setIsConnected(true)

    // Simulate some active users for demo
    setActiveUsers([
      { id: "1", name: "Alice Johnson", status: "online" },
      { id: "2", name: "Bob Smith", status: "idle" },
      { id: "3", name: "Carol Davis", status: "online" },
    ])

    // Clean up on unmount
    return () => {
      mockSocket.disconnect()
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket, activeUsers, events, isConnected, sendEvent }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  return useContext(SocketContext)
}
