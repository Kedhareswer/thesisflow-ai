"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { io, type Socket } from "socket.io-client"

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
  connectionError: string | null
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  activeUsers: [],
  events: [],
  isConnected: false,
  connectionError: null,
})

export function useSocket() {
  return useContext(SocketContext)
}

interface SocketProviderProps {
  children: React.ReactNode
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [activeUsers, setActiveUsers] = useState<User[]>([])
  const [events, setEvents] = useState<SocketEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    // Only attempt socket connection if we have a socket server URL
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'
    
    console.log('Attempting to connect to socket server:', socketUrl)

    const socketInstance = io(socketUrl, {
      timeout: 5000,
      retries: 3,
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
    })

    // Connection success
    socketInstance.on("connect", () => {
      console.log("Connected to socket server")
      setIsConnected(true)
      setConnectionError(null)
    })

    // Connection error
    socketInstance.on("connect_error", (error) => {
      console.warn("Socket connection failed:", error.message)
      setIsConnected(false)
      setConnectionError("Real-time features unavailable. Operating in offline mode.")
      // Don't retry immediately in production
    })

    // Disconnection
    socketInstance.on("disconnect", (reason) => {
      console.log("Disconnected from socket server:", reason)
        setIsConnected(false)
      
      if (reason === "io server disconnect") {
        // Server initiated disconnect, try to reconnect
        socketInstance.connect()
    }
    })

    // Reconnection success
    socketInstance.on("reconnect", (attemptNumber) => {
      console.log("Reconnected to socket server after", attemptNumber, "attempts")
    setIsConnected(true)
      setConnectionError(null)
    })

    // Reconnection failed
    socketInstance.on("reconnect_failed", () => {
      console.warn("Failed to reconnect to socket server")
      setConnectionError("Unable to connect to real-time server. Some features may be limited.")
    })

    setSocket(socketInstance)

    return () => {
      console.log("Cleaning up socket connection")
      socketInstance.close()
    }
  }, [])

  return (
    <SocketContext.Provider
      value={{
        socket,
        activeUsers,
        events,
        isConnected,
        connectionError,
      }}
    >
      {children}
      
      {/* Optional: Show connection status in development */}
      {process.env.NODE_ENV === 'development' && connectionError && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 rounded shadow-lg text-sm max-w-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">{connectionError}</p>
            </div>
          </div>
        </div>
      )}
    </SocketContext.Provider>
  )
}
