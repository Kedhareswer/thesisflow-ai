/**
 * Extract Data v2 - Timeline Replay Component
 * Phase 2: View and replay extraction timeline events
 */

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { ExtractPhase } from '@/lib/types/extract-stream';

interface TimelineEvent {
  id: string;
  extraction_id: string;
  session_id: string;
  file_id?: string;
  event_type: string;
  phase: ExtractPhase;
  message: string;
  event_data?: any;
  timestamp: Date;
}

interface TimelineReplayProps {
  sessionId?: string;
  extractionId?: string;
  isLive?: boolean; // Whether to show live events or historical
  maxEvents?: number;
}

export function TimelineReplay({ 
  sessionId, 
  extractionId, 
  isLive = false, 
  maxEvents = 50 
}: TimelineReplayProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load timeline events
  useEffect(() => {
    if (!sessionId && !extractionId) return;
    
    loadTimeline();
  }, [sessionId, extractionId]);

  const loadTimeline = async () => {
    if (!sessionId && !extractionId) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sessionId) params.set('sessionId', sessionId);
      if (extractionId) params.set('extractionId', extractionId);
      
      const response = await fetch(`/api/extract/timeline?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setEvents(data.events.slice(-maxEvents)); // Keep recent events
      }
    } catch (error) {
      console.error('Failed to load timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const startReplay = () => {
    setIsReplaying(true);
    setReplayIndex(0);
    
    // Replay events with timing
    const replayInterval = setInterval(() => {
      setReplayIndex(prev => {
        if (prev >= events.length - 1) {
          clearInterval(replayInterval);
          setIsReplaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 500); // 500ms between events
  };

  const stopReplay = () => {
    setIsReplaying(false);
  };

  const resetReplay = () => {
    setIsReplaying(false);
    setReplayIndex(0);
  };

  const getPhaseIcon = (phase: ExtractPhase) => {
    const icons = {
      uploading: '📤',
      queued: '⏳',
      parsing: '📄',
      analyzing: '🔍',
      tables: '📊',
      entities: '🏷️',
      citations: '📚',
      summarizing: '📝',
      completed: '✅',
      failed: '❌',
    };
    return icons[phase] || '⚪';
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const visibleEvents = isReplaying ? events.slice(0, replayIndex + 1) : events;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            Activity Timeline
          </h3>
          {events.length > 0 && (
            <span className="text-xs text-gray-500">({events.length})</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Replay Controls */}
          {events.length > 0 && !isLive && (
            <div className="flex items-center gap-1">
              {!isReplaying ? (
                <button
                  onClick={startReplay}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title="Replay timeline"
                >
                  <Play className="h-3 w-3" />
                </button>
              ) : (
                <button
                  onClick={stopReplay}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title="Stop replay"
                >
                  <Pause className="h-3 w-3" />
                </button>
              )}
              <button
                onClick={resetReplay}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="Reset replay"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Timeline Events */}
      {isExpanded && (
        <div className="max-h-64 overflow-y-auto p-3">
          {loading ? (
            <div className="text-center text-sm text-gray-500 py-4">
              Loading timeline...
            </div>
          ) : visibleEvents.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-4">
              {isLive ? 'Activity will appear here as processing begins.' : 'No timeline events found.'}
            </div>
          ) : (
            <div className="space-y-2">
              {visibleEvents.map((event, index) => (
                <div
                  key={event.id}
                  className={`flex items-start gap-3 rounded-md p-2 text-sm transition-colors ${
                    isReplaying && index === replayIndex 
                      ? 'bg-orange-50 border border-orange-200' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0 text-base">
                    {getPhaseIcon(event.phase)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-gray-900">{event.message}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatTimestamp(event.timestamp)}</span>
                      <span>•</span>
                      <span className="capitalize">{event.phase}</span>
                      {event.file_id && (
                        <>
                          <span>•</span>
                          <span>{event.file_id}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Replay Progress */}
      {isReplaying && events.length > 0 && (
        <div className="border-t border-gray-200 p-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Replaying...</span>
            <span>{replayIndex + 1} / {events.length}</span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-gray-200">
            <div 
              className="h-1 rounded-full bg-orange-500 transition-all duration-300" 
              style={{ width: `${((replayIndex + 1) / events.length) * 100}%` }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
