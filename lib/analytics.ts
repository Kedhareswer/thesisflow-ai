export interface AnalyticsEvent {
  event: string
  properties?: Record<string, any>
  userId?: string
  timestamp?: Date
}

export interface UsageMetrics {
  totalSessions: number
  averageSessionDuration: number
  featuresUsed: Record<string, number>
  userEngagement: number
}

export class Analytics {
  private static events: AnalyticsEvent[] = []

  static track(event: string, properties?: Record<string, any>, userId?: string) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      userId,
      timestamp: new Date(),
    }

    this.events.push(analyticsEvent)

    // In a real app, send to analytics service
    console.log("Analytics Event:", analyticsEvent)
  }

  static getUsageMetrics(): UsageMetrics {
    const now = new Date()
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const recentEvents = this.events.filter((event) => event.timestamp && event.timestamp >= last30Days)

    const featuresUsed: Record<string, number> = {}
    recentEvents.forEach((event) => {
      featuresUsed[event.event] = (featuresUsed[event.event] || 0) + 1
    })

    return {
      totalSessions: recentEvents.filter((e) => e.event === "session_start").length,
      averageSessionDuration: 25, // Mock data
      featuresUsed,
      userEngagement: recentEvents.length / 30, // Events per day
    }
  }

  static trackFeatureUsage(feature: string, userId?: string) {
    this.track("feature_used", { feature }, userId)
  }

  static trackPageView(page: string, userId?: string) {
    this.track("page_view", { page }, userId)
  }

  static trackError(error: string, context?: Record<string, any>, userId?: string) {
    this.track("error", { error, ...context }, userId)
  }
}
