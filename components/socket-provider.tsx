"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

// Define the structure of a socket event
export interface SocketEvent {
  type: string
  payload: any
  timestamp: number
  userId?: string
}

// Define the active user type
export interface ActiveUser {
  id: string
  name: string
  avatar?: string
}

// Define the socket context type
interface SocketContextType {
  isConnected: boolean
  events: SocketEvent[]
  activeUsers: ActiveUser[]
  sendEvent: (type: string, payload: any) => void
}

// Create the context with a default value
const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  events: [],
  activeUsers: [],
  sendEvent: () => {},
})

// Custom hook to use the socket context
export function useSocket() {
  return useContext(SocketContext)
}

// Socket provider component
export function SocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [events, setEvents] = useState<SocketEvent[]>([])
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([
    { id: "user-1", name: "You", avatar: "" },
    { id: "user-2", name: "Alex Johnson", avatar: "" },
    { id: "user-3", name: "Sam Taylor", avatar: "" },
  ])

  // Mock function to send an event
  const sendEvent = (type: string, payload: any) => {
    const newEvent: SocketEvent = {
      type,
      payload,
      timestamp: Date.now(),
      userId: "user-1", // Current user ID
    }

    setEvents((prev) => [...prev, newEvent])

    // In a real implementation, this would send the event to the server
    console.log("Event sent:", newEvent)
  }

  // Mock socket connection
  useEffect(() => {
    // Simulate connection delay
    const timer = setTimeout(() => {
      setIsConnected(true)
      console.log("Socket connected")
    }, 1000)

    return () => {
      clearTimeout(timer)
      setIsConnected(false)
      console.log("Socket disconnected")
    }
  }, [])

  // Mock receiving events (for demo purposes)
  useEffect(() => {
    if (!isConnected) return

    // Simulate receiving events periodically
    const interval = setInterval(() => {
      // Only add random events occasionally
      if (Math.random() > 0.9) {
        const eventTypes = ["paper_summarized", "idea_generated", "collaborator_joined"]
        const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)]

        // Random user ID (excluding the current user)
        const randomUserId = Math.random() > 0.5 ? "user-2" : "user-3"

        let payload: any = {}

        if (randomType === "paper_summarized") {
          const titles = [
            "Advances in Neural Networks",
            "Climate Change Mitigation Strategies",
            "Quantum Computing Applications",
            "Genomic Analysis Techniques",
          ]
          payload = {
            title: titles[Math.floor(Math.random() * titles.length)],
            wordCount: Math.floor(Math.random() * 5000) + 1000,
          }
        } else if (randomType === "idea_generated") {
          const topics = ["Sustainable Energy", "Artificial Intelligence", "Biotechnology", "Space Exploration"]
          payload = {
            topic: topics[Math.floor(Math.random() * topics.length)],
            count: Math.floor(Math.random() * 5) + 1,
          }
        } else if (randomType === "collaborator_joined") {
          const names = ["Alex", "Jordan", "Taylor", "Morgan", "Casey"]
          payload = {
            name: names[Math.floor(Math.random() * names.length)],
            role: "researcher",
          }
        }

        const newEvent: SocketEvent = {
          type: randomType,
          payload,
          timestamp: Date.now(),
          userId: randomUserId,
        }

        setEvents((prev) => [...prev, newEvent])
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isConnected])

  return (
    <SocketContext.Provider value={{ isConnected, events, activeUsers, sendEvent }}>{children}</SocketContext.Provider>
  )
}
