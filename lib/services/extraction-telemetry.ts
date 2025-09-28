/**
 * Extract Data v2 - Telemetry Service
 * Phase 4: Analytics and performance tracking
 */

import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { ExtractPhase } from '@/lib/types/extract-stream';

export interface ExtractionTelemetryEvent {
  event_type: 'extraction_started' | 'extraction_completed' | 'extraction_failed' | 'chat_message' | 'export_action' | 'timeline_replay';
  session_id: string;
  user_id: string;
  file_id?: string;
  extraction_id?: string;
  
  // Performance metrics
  duration_ms?: number;
  file_size_bytes?: number;
  pages_processed?: number;
  tables_found?: number;
  entities_found?: number;
  citations_found?: number;
  
  // Chat metrics
  message_length?: number;
  response_length?: number;
  tokens_used?: number;
  model_used?: string;
  provider_used?: string;
  
  // Error tracking
  error_message?: string;
  error_phase?: ExtractPhase;
  
  // User interaction
  export_format?: string;
  timeline_duration_ms?: number;
  
  // Additional metadata
  metadata?: Record<string, any>;
}

export class ExtractionTelemetryService {
  private admin = getSupabaseAdmin();

  /**
   * Track an extraction telemetry event
   */
  async trackEvent(event: ExtractionTelemetryEvent): Promise<void> {
    try {
      await this.admin
        .from('extraction_telemetry' as any)
        .insert({
          event_type: event.event_type,
          session_id: event.session_id,
          user_id: event.user_id,
          file_id: event.file_id,
          extraction_id: event.extraction_id,
          duration_ms: event.duration_ms,
          file_size_bytes: event.file_size_bytes,
          pages_processed: event.pages_processed,
          tables_found: event.tables_found,
          entities_found: event.entities_found,
          citations_found: event.citations_found,
          message_length: event.message_length,
          response_length: event.response_length,
          tokens_used: event.tokens_used,
          model_used: event.model_used,
          provider_used: event.provider_used,
          error_message: event.error_message,
          error_phase: event.error_phase,
          export_format: event.export_format,
          timeline_duration_ms: event.timeline_duration_ms,
          metadata: event.metadata,
          timestamp: new Date().toISOString(),
        });
    } catch (error) {
      // Telemetry should never break the main flow
      console.warn('Telemetry tracking failed (non-fatal):', error);
    }
  }

  /**
   * Track extraction start
   */
  async trackExtractionStart(sessionId: string, userId: string, files: Array<{ id: string; size: number }>): Promise<void> {
    for (const file of files) {
      await this.trackEvent({
        event_type: 'extraction_started',
        session_id: sessionId,
        user_id: userId,
        file_id: file.id,
        file_size_bytes: file.size,
      });
    }
  }

  /**
   * Track extraction completion
   */
  async trackExtractionComplete(
    sessionId: string, 
    userId: string, 
    fileId: string, 
    extractionId: string,
    metrics: {
      duration_ms: number;
      pages_processed?: number;
      tables_found?: number;
      entities_found?: number;
      citations_found?: number;
    }
  ): Promise<void> {
    await this.trackEvent({
      event_type: 'extraction_completed',
      session_id: sessionId,
      user_id: userId,
      file_id: fileId,
      extraction_id: extractionId,
      ...metrics,
    });
  }

  /**
   * Track extraction failure
   */
  async trackExtractionFailure(
    sessionId: string, 
    userId: string, 
    fileId: string, 
    error: string, 
    phase: ExtractPhase,
    duration_ms?: number
  ): Promise<void> {
    await this.trackEvent({
      event_type: 'extraction_failed',
      session_id: sessionId,
      user_id: userId,
      file_id: fileId,
      error_message: error,
      error_phase: phase,
      duration_ms,
    });
  }

  /**
   * Track chat message
   */
  async trackChatMessage(
    sessionId: string, 
    userId: string, 
    extractionId: string,
    messageLength: number,
    responseLength: number,
    tokensUsed: number,
    modelUsed: string,
    providerUsed: string
  ): Promise<void> {
    await this.trackEvent({
      event_type: 'chat_message',
      session_id: sessionId,
      user_id: userId,
      extraction_id: extractionId,
      message_length: messageLength,
      response_length: responseLength,
      tokens_used: tokensUsed,
      model_used: modelUsed,
      provider_used: providerUsed,
    });
  }

  /**
   * Track export action
   */
  async trackExport(
    sessionId: string, 
    userId: string, 
    extractionId: string,
    format: string,
    itemCount?: number
  ): Promise<void> {
    await this.trackEvent({
      event_type: 'export_action',
      session_id: sessionId,
      user_id: userId,
      extraction_id: extractionId,
      export_format: format,
      metadata: { item_count: itemCount },
    });
  }

  /**
   * Track timeline replay
   */
  async trackTimelineReplay(
    sessionId: string, 
    userId: string, 
    duration_ms: number,
    eventCount: number
  ): Promise<void> {
    await this.trackEvent({
      event_type: 'timeline_replay',
      session_id: sessionId,
      user_id: userId,
      timeline_duration_ms: duration_ms,
      metadata: { event_count: eventCount },
    });
  }

  /**
   * Get analytics summary for a user
   */
  async getUserAnalytics(userId: string, days: number = 30): Promise<{
    totalExtractions: number;
    successfulExtractions: number;
    failedExtractions: number;
    totalChatMessages: number;
    totalTokensUsed: number;
    avgExtractionTime: number;
    topFileTypes: Array<{ type: string; count: number }>;
    topModels: Array<{ model: string; count: number }>;
  }> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data: events } = await this.admin
        .from('extraction_telemetry' as any)
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', since.toISOString());

      if (!events || events.length === 0) {
        return {
          totalExtractions: 0,
          successfulExtractions: 0,
          failedExtractions: 0,
          totalChatMessages: 0,
          totalTokensUsed: 0,
          avgExtractionTime: 0,
          topFileTypes: [],
          topModels: [],
        };
      }

      const extractions = events.filter(e => e.event_type === 'extraction_started');
      const completions = events.filter(e => e.event_type === 'extraction_completed');
      const failures = events.filter(e => e.event_type === 'extraction_failed');
      const chats = events.filter(e => e.event_type === 'chat_message');

      const totalTokens = chats.reduce((sum, chat) => sum + (chat.tokens_used || 0), 0);
      const avgTime = completions.length > 0 
        ? completions.reduce((sum, comp) => sum + (comp.duration_ms || 0), 0) / completions.length
        : 0;

      // File type analysis (would need file extension data)
      const fileTypes: Record<string, number> = {};
      // Model usage analysis
      const models: Record<string, number> = {};
      chats.forEach(chat => {
        if (chat.model_used) {
          models[chat.model_used] = (models[chat.model_used] || 0) + 1;
        }
      });

      return {
        totalExtractions: extractions.length,
        successfulExtractions: completions.length,
        failedExtractions: failures.length,
        totalChatMessages: chats.length,
        totalTokensUsed: totalTokens,
        avgExtractionTime: Math.round(avgTime),
        topFileTypes: Object.entries(fileTypes)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        topModels: Object.entries(models)
          .map(([model, count]) => ({ model, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      };
    } catch (error) {
      console.error('Analytics fetch failed:', error);
      return {
        totalExtractions: 0,
        successfulExtractions: 0,
        failedExtractions: 0,
        totalChatMessages: 0,
        totalTokensUsed: 0,
        avgExtractionTime: 0,
        topFileTypes: [],
        topModels: [],
      };
    }
  }
}

export const extractionTelemetry = new ExtractionTelemetryService();
