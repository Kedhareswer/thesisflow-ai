import type { Socket } from "socket.io-client"

/**
 * Safely emit a socket event with error handling
 */
export function safeSocketEmit(
  socket: Socket | null, 
  event: string, 
  data?: any,
  options?: {
    timeout?: number
    retries?: number
    onError?: (error: Error) => void
    onSuccess?: () => void
  }
) {
  if (!socket || !socket.connected) {
    console.log(`Socket not connected, skipping emit: ${event}`)
    options?.onError?.(new Error('Socket not connected'))
    return false
  }

  try {
    const timeout = options?.timeout || 5000
    const retries = options?.retries || 0

    // Emit with timeout
    const emitWithTimeout = () => {
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Socket emit timeout for event: ${event}`))
        }, timeout)

        try {
          socket.emit(event, data, (response?: any) => {
            clearTimeout(timer)
            if (response?.error) {
              reject(new Error(response.error))
            } else {
              resolve()
            }
          })
        } catch (error) {
          clearTimeout(timer)
          reject(error)
        }
      })
    }

    // Execute with retries
    const executeWithRetries = async (attempt = 0): Promise<void> => {
      try {
        await emitWithTimeout()
        options?.onSuccess?.()
      } catch (error) {
        console.warn(`Socket emit failed for ${event} (attempt ${attempt + 1}):`, error)
        
        if (attempt < retries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
          return executeWithRetries(attempt + 1)
        } else {
          options?.onError?.(error as Error)
          throw error
        }
      }
    }

    executeWithRetries().catch((error) => {
      console.error(`Failed to emit socket event ${event} after ${retries + 1} attempts:`, error)
    })

    return true
  } catch (error) {
    console.error(`Error emitting socket event ${event}:`, error)
    options?.onError?.(error as Error)
    return false
  }
}

/**
 * Common socket event types used in the application
 */
export const SOCKET_EVENTS = {
  // User activity
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  USER_TYPING: 'user_typing',
  
  // Project events
  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
  PROJECT_DELETED: 'project_deleted',
  
  // Task events
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  TASK_DELETED: 'task_deleted',
  
  // Team collaboration
  TEAM_CREATED: 'team_created',
  TEAM_JOINED: 'team_joined',
  TEAM_LEFT: 'team_left',
  
  // Chat events
  CHAT_MESSAGE: 'chat_message',
  CHAT_TYPING: 'chat_typing',
  
  // Document events
  DOCUMENT_SHARED: 'document_shared',
  DOCUMENT_EDITED: 'document_edited',
  
  // AI events
  PAPER_SUMMARIZED: 'paper_summarized',
  IDEA_GENERATED: 'idea_generated',
  AI_QUERY: 'ai_query',
  
  // System events
  NOTIFICATION: 'notification',
  ERROR: 'error',
} as const

export type SocketEventType = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS]

/**
 * Helper hook for socket operations with error handling
 */
export function createSocketHelper(socket: Socket | null, isConnected: boolean) {
  return {
    emit: (event: string, data?: any, options?: Parameters<typeof safeSocketEmit>[3]) => {
      return safeSocketEmit(socket, event, data, options)
    },
    
    isConnected,
    
    /**
     * Emit with automatic retry logic
     */
    emitWithRetry: (event: string, data?: any, retries = 3) => {
      return safeSocketEmit(socket, event, data, { retries })
    },
    
    /**
     * Emit and wait for acknowledgment
     */
    emitWithAck: (event: string, data?: any, timeout = 5000) => {
      return new Promise<any>((resolve, reject) => {
        if (!socket || !isConnected) {
          reject(new Error('Socket not connected'))
          return
        }
        
        const timer = setTimeout(() => {
          reject(new Error(`Timeout waiting for acknowledgment of ${event}`))
        }, timeout)
        
        socket.emit(event, data, (response: any) => {
          clearTimeout(timer)
          if (response?.error) {
            reject(new Error(response.error))
          } else {
            resolve(response)
          }
        })
      })
    },
    
    /**
     * Listen to an event with cleanup
     */
    on: (event: string, callback: (...args: any[]) => void) => {
      if (!socket) return () => {}
      
      socket.on(event, callback)
      
      // Return cleanup function
      return () => {
        socket.off(event, callback)
      }
    },
    
    /**
     * Join a room
     */
    joinRoom: (roomId: string) => {
      return safeSocketEmit(socket, 'join_room', { roomId })
    },
    
    /**
     * Leave a room
     */
    leaveRoom: (roomId: string) => {
      return safeSocketEmit(socket, 'leave_room', { roomId })
    },
  }
} 