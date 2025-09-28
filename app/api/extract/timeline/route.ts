/**
 * Extract Data v2 - Timeline API
 * Phase 2: Retrieve and replay extraction timeline events
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { timelinePersistence } from '@/lib/services/timeline-persistence';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const extractionId = searchParams.get('extractionId');
    const stats = searchParams.get('stats') === 'true';

    if (!sessionId && !extractionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId or extractionId required' },
        { status: 400 }
      );
    }

    if (stats && sessionId) {
      // Return timeline statistics
      const timelineStats = await timelinePersistence.getTimelineStats(sessionId);
      return NextResponse.json({
        success: true,
        stats: timelineStats,
      });
    }

    // Return timeline events
    const events = sessionId 
      ? await timelinePersistence.getSessionTimeline(sessionId)
      : await timelinePersistence.getExtractionTimeline(extractionId!);

    return NextResponse.json({
      success: true,
      events,
      count: events.length,
    });

  } catch (error) {
    console.error('Timeline API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Timeline fetch failed' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId required' },
        { status: 400 }
      );
    }

    const deleted = await timelinePersistence.deleteSessionTimeline(sessionId);

    return NextResponse.json({
      success: deleted,
      message: deleted ? 'Timeline deleted' : 'Timeline deletion failed',
    });

  } catch (error) {
    console.error('Timeline deletion error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Timeline deletion failed' 
      },
      { status: 500 }
    );
  }
}
