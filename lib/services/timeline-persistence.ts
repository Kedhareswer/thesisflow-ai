/**
 * Extract Data v2 - Timeline Persistence Service
 * Phase 2: Store and replay extraction timeline events
 */

import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { ExtractPhase } from '@/lib/types/extract-stream';

export interface TimelineEvent {
  id?: string;
  extraction_id: string;
  session_id: string;
  file_id?: string;
  event_type: string;
  phase: ExtractPhase;
  message: string;
  event_data?: any;
  timestamp: Date;
}

export class TimelinePersistenceService {
  private admin = getSupabaseAdmin();

  /**
   * Save a timeline event to the database
   */
  async saveEvent(event: Omit<TimelineEvent, 'id' | 'timestamp'>): Promise<string | null> {
    try {
      const { data, error } = await this.admin
        .from('extraction_timeline' as any)
        .insert({
          extraction_id: event.extraction_id,
          session_id: event.session_id,
          file_id: event.file_id,
          event_type: event.event_type,
          phase: event.phase,
          message: event.message,
          event_data: event.event_data,
          timestamp: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to save timeline event:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Timeline persistence error:', error);
      return null;
    }
  }

  /**
   * Get timeline events for a session
   */
  async getSessionTimeline(sessionId: string): Promise<TimelineEvent[]> {
    try {
      const { data, error } = await this.admin
        .from('extraction_timeline' as any)
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Failed to fetch timeline:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        extraction_id: row.extraction_id,
        session_id: row.session_id,
        file_id: row.file_id,
        event_type: row.event_type,
        phase: row.phase,
        message: row.message,
        event_data: row.event_data,
        timestamp: new Date(row.timestamp),
      }));
    } catch (error) {
      console.error('Timeline fetch error:', error);
      return [];
    }
  }

  /**
   * Get timeline events for a specific extraction
   */
  async getExtractionTimeline(extractionId: string): Promise<TimelineEvent[]> {
    try {
      const { data, error } = await this.admin
        .from('extraction_timeline' as any)
        .select('*')
        .eq('extraction_id', extractionId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Failed to fetch extraction timeline:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        extraction_id: row.extraction_id,
        session_id: row.session_id,
        file_id: row.file_id,
        event_type: row.event_type,
        phase: row.phase,
        message: row.message,
        event_data: row.event_data,
        timestamp: new Date(row.timestamp),
      }));
    } catch (error) {
      console.error('Extraction timeline fetch error:', error);
      return [];
    }
  }

  /**
   * Delete timeline events for a session (cleanup)
   */
  async deleteSessionTimeline(sessionId: string): Promise<boolean> {
    try {
      const { error } = await this.admin
        .from('extraction_timeline' as any)
        .delete()
        .eq('session_id', sessionId);

      if (error) {
        console.error('Failed to delete timeline:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Timeline deletion error:', error);
      return false;
    }
  }

  /**
   * Get timeline statistics for analytics
   */
  async getTimelineStats(sessionId: string): Promise<{
    totalEvents: number;
    phases: Record<ExtractPhase, number>;
    duration: number; // in milliseconds
    filesProcessed: number;
  }> {
    try {
      const events = await this.getSessionTimeline(sessionId);
      
      if (events.length === 0) {
        return {
          totalEvents: 0,
          phases: {} as Record<ExtractPhase, number>,
          duration: 0,
          filesProcessed: 0,
        };
      }

      const phases = events.reduce((acc, event) => {
        acc[event.phase] = (acc[event.phase] || 0) + 1;
        return acc;
      }, {} as Record<ExtractPhase, number>);

      const firstEvent = events[0];
      const lastEvent = events[events.length - 1];
      const duration = lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime();

      const uniqueFiles = new Set(events.filter(e => e.file_id).map(e => e.file_id));

      return {
        totalEvents: events.length,
        phases,
        duration,
        filesProcessed: uniqueFiles.size,
      };
    } catch (error) {
      console.error('Timeline stats error:', error);
      return {
        totalEvents: 0,
        phases: {} as Record<ExtractPhase, number>,
        duration: 0,
        filesProcessed: 0,
      };
    }
  }
}

export const timelinePersistence = new TimelinePersistenceService();
