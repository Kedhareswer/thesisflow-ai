"use client"

// Service to keep Render free tier services awake
class RenderKeepAliveService {
  private intervalId: NodeJS.Timeout | null = null
  private readonly isDev = process.env.NODE_ENV === 'development'
  private readonly enabled = process.env.RENDER_KEEPALIVE_ENABLED === 'true'
  private readonly interval = parseInt(process.env.RENDER_KEEPALIVE_INTERVAL || "300000", 10) // 5 minutes default

  start(): void {
    if (!this.enabled || this.intervalId) return

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL
    if (!socketUrl || socketUrl.includes('localhost')) return

    if (this.isDev) console.debug('render-keepalive: starting service')

    this.intervalId = setInterval(async () => {
      try {
        await fetch(socketUrl, {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-cache',
        })
        if (this.isDev) console.debug('render-keepalive: ping sent')
      } catch (error) {
        if (this.isDev) console.debug('render-keepalive: ping failed', error)
      }
    }, this.interval)
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      if (this.isDev) console.debug('render-keepalive: service stopped')
    }
  }

  // Manual wake-up call
  async wakeUp(): Promise<boolean> {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL
    if (!socketUrl || socketUrl.includes('localhost')) return false

    try {
      if (this.isDev) console.debug('render-keepalive: manual wake-up')
      await fetch(socketUrl, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-cache',
      })
      return true
    } catch (error) {
      if (this.isDev) console.debug('render-keepalive: manual wake-up failed', error)
      return false
    }
  }
}

// Singleton instance
export const renderKeepAliveService = new RenderKeepAliveService()

// Auto-start in browser environment
if (typeof window !== 'undefined') {
  renderKeepAliveService.start()
  
  // Stop on page unload
  window.addEventListener('beforeunload', () => {
    renderKeepAliveService.stop()
  })
}
