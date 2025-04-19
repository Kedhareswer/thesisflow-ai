// Analytics utility functions for tracking user behavior and feature usage

// Types
export interface AnalyticsEvent {
  eventName: string
  userId: string
  timestamp: Date
  properties: Record<string, any>
}

export interface UsageMetrics {
  aiPrompts: number
  paperSummaries: number
  mindMaps: number
  collaborators: number
  storage: number // in MB
}

// Mock analytics storage
let analyticsEvents: AnalyticsEvent[] = []

// Track an event
export function trackEvent(eventName: string, userId: string, properties: Record<string, any> = {}): void {
  const event: AnalyticsEvent = {
    eventName,
    userId,
    timestamp: new Date(),
    properties,
  }

  // In a real app, this would send the event to an analytics service
  console.log("Analytics event:", event)

  // Store event in mock storage
  analyticsEvents.push(event)

  // Also update local storage for demo purposes
  try {
    const storedEvents = localStorage.getItem("analytics_events")
    const events = storedEvents ? JSON.parse(storedEvents) : []
    events.push(event)
    localStorage.setItem("analytics_events", JSON.stringify(events))
  } catch (error) {
    console.error("Error storing analytics event:", error)
  }
}

// Track feature usage
export function trackFeatureUsage(feature: keyof UsageMetrics, userId: string, amount = 1): void {
  trackEvent("feature_used", userId, {
    feature,
    amount,
  })

  // Update usage metrics in local storage
  try {
    const storedMetrics = localStorage.getItem(`usage_metrics_${userId}`)
    const metrics: Partial<UsageMetrics> = storedMetrics ? JSON.parse(storedMetrics) : {}

    metrics[feature] = (metrics[feature] || 0) + amount

    localStorage.setItem(`usage_metrics_${userId}`, JSON.stringify(metrics))
  } catch (error) {
    console.error("Error updating usage metrics:", error)
  }
}

// Get usage metrics for a user
export function getUserMetrics(userId: string): Partial<UsageMetrics> {
  try {
    const storedMetrics = localStorage.getItem(`usage_metrics_${userId}`)
    return storedMetrics ? JSON.parse(storedMetrics) : {}
  } catch (error) {
    console.error("Error getting user metrics:", error)
    return {}
  }
}

// Get events for a specific user
export function getUserEvents(userId: string): AnalyticsEvent[] {
  return analyticsEvents.filter((event) => event.userId === userId)
}

// Get events for a specific feature
export function getFeatureEvents(feature: string): AnalyticsEvent[] {
  return analyticsEvents.filter((event) => event.eventName === "feature_used" && event.properties.feature === feature)
}

// Clear analytics data (for testing)
export function clearAnalyticsData(): void {
  analyticsEvents = []
  localStorage.removeItem("analytics_events")
}

// Track page view
export function trackPageView(userId: string, path: string): void {
  trackEvent("page_view", userId, { path })
}

// Track subscription change
export function trackSubscriptionChange(userId: string, oldTier: string, newTier: string): void {
  trackEvent("subscription_change", userId, {
    oldTier,
    newTier,
    upgradeDate: new Date().toISOString(),
  })
}

// Track AI prompt usage
export function trackAIPrompt(userId: string, promptType: string, promptLength: number, responseLength: number): void {
  trackEvent("ai_prompt", userId, {
    promptType,
    promptLength,
    responseLength,
    processingTime: Math.floor(Math.random() * 2000) + 500, // Mock processing time
  })

  // Also track as feature usage
  trackFeatureUsage("aiPrompts", userId)
}

// Track paper summary
export function trackPaperSummary(
  userId: string,
  paperTitle: string,
  paperLength: number,
  summaryLength: number,
): void {
  trackEvent("paper_summary", userId, {
    paperTitle,
    paperLength,
    summaryLength,
  })

  // Also track as feature usage
  trackFeatureUsage("paperSummaries", userId)
}

// Track mind map creation
export function trackMindMapCreation(userId: string, nodeCount: number, connectionCount: number): void {
  trackEvent("mind_map_creation", userId, {
    nodeCount,
    connectionCount,
  })

  // Also track as feature usage
  trackFeatureUsage("mindMaps", userId)
}

// Track storage usage
export function trackStorageUsage(
  userId: string,
  fileSize: number, // in MB
  fileType: string,
): void {
  trackEvent("storage_usage", userId, {
    fileSize,
    fileType,
  })

  // Also track as feature usage
  trackFeatureUsage("storage", userId, fileSize)
}
