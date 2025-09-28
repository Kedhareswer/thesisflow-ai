/**
 * Extract Data v2 - Insights Rail (Right Column)
 * Phase 0: Stepper + Key Insights + Activity Timeline placeholders
 */

import React from 'react';
import { CheckCircle, Clock, AlertCircle, ChevronRight, Activity } from 'lucide-react';
import { ExtractPhase } from '@/lib/types/extract-stream';

interface InsightsRailProps {
  // Progress data
  currentPhase: ExtractPhase;
  overallProgress: number;
  
  // Insights data
  insights: Array<{
    fileId: string;
    summary: string;
    keyPoints: string[];
  }>;
  
  // Timeline data
  timeline: Array<{
    timestamp: Date;
    fileId?: string;
    phase: ExtractPhase;
    message: string;
  }>;
  
  // Session metrics
  metrics?: {
    filesProcessed: number;
    totalFiles: number;
    pagesProcessed?: number;
    tablesFound?: number;
    entitiesFound?: number;
    ocrEnabled?: boolean;
  };
}

export function InsightsRail({
  currentPhase,
  overallProgress,
  insights,
  timeline,
  metrics,
}: InsightsRailProps) {
  const phases: Array<{ key: ExtractPhase; label: string; description: string }> = [
    { key: 'uploading', label: 'Uploading', description: 'Preparing files' },
    { key: 'queued', label: 'Queued', description: 'Waiting to process' },
    { key: 'parsing', label: 'Parsing', description: 'Reading document structure' },
    { key: 'analyzing', label: 'Analyzing', description: 'Extracting content' },
    { key: 'tables', label: 'Tables', description: 'Finding data tables' },
    { key: 'entities', label: 'Entities', description: 'Identifying key entities' },
    { key: 'citations', label: 'Citations', description: 'Extracting references' },
    { key: 'summarizing', label: 'Summarizing', description: 'Generating insights' },
    { key: 'completed', label: 'Completed', description: 'Processing finished' },
  ];

  const getPhaseStatus = (phase: ExtractPhase) => {
    const currentIndex = phases.findIndex(p => p.key === currentPhase);
    const phaseIndex = phases.findIndex(p => p.key === phase);
    
    if (currentPhase === 'failed') {
      return phaseIndex <= currentIndex ? 'error' : 'pending';
    }
    
    if (phaseIndex < currentIndex) return 'completed';
    if (phaseIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'current':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  // Get top insights across all files
  const topInsights = insights.flatMap(insight => 
    insight.keyPoints.slice(0, 2).map(point => ({
      fileId: insight.fileId,
      point,
    }))
  ).slice(0, 5);

  // Get recent timeline events
  const recentEvents = timeline.slice(-5).reverse();

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white">
      {/* Research Progress */}
      <div className="border-b border-gray-200 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Research Progress</h3>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">Overall Progress</span>
            <span className="text-sm font-medium text-gray-900">{overallProgress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div 
              className="h-2 rounded-full bg-orange-500 transition-all duration-300" 
              style={{ width: `${overallProgress}%` }} 
            />
          </div>
        </div>

        {/* Phase Stepper */}
        <div className="space-y-2">
          {phases.slice(0, 6).map((phase, index) => {
            const status = getPhaseStatus(phase.key);
            return (
              <div key={phase.key} className="flex items-center gap-3">
                {getStatusIcon(status)}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${
                    status === 'current' ? 'text-orange-600' :
                    status === 'completed' ? 'text-green-600' :
                    status === 'error' ? 'text-red-600' :
                    'text-gray-500'
                  }`}>
                    {phase.label}
                  </div>
                  <div className="text-xs text-gray-500">{phase.description}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Session Metrics */}
        {metrics && (
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded bg-gray-50 p-2">
              <div className="font-medium text-gray-900">Files</div>
              <div className="text-gray-600">{metrics.filesProcessed}/{metrics.totalFiles}</div>
            </div>
            {metrics.tablesFound !== undefined && (
              <div className="rounded bg-gray-50 p-2">
                <div className="font-medium text-gray-900">Tables</div>
                <div className="text-gray-600">{metrics.tablesFound}</div>
              </div>
            )}
            {metrics.entitiesFound !== undefined && (
              <div className="rounded bg-gray-50 p-2">
                <div className="font-medium text-gray-900">Entities</div>
                <div className="text-gray-600">{metrics.entitiesFound}</div>
              </div>
            )}
            {metrics.ocrEnabled && (
              <div className="rounded bg-gray-50 p-2">
                <div className="font-medium text-gray-900">OCR</div>
                <div className="text-gray-600">Enabled</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Key Insights */}
      <div className="border-b border-gray-200 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Key Insights</h3>
        {topInsights.length > 0 ? (
          <div className="space-y-2">
            {topInsights.map((insight, index) => (
              <div key={`${insight.fileId}-${index}`} className="text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                  <div className="line-clamp-2">{insight.point}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            Key insights will appear here as documents are processed.
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Activity Timeline</h3>
          {timeline.length > 5 && (
            <button className="text-xs text-orange-600 hover:text-orange-700">
              View all
            </button>
          )}
        </div>
        
        {recentEvents.length > 0 ? (
          <div className="space-y-3 overflow-y-auto">
            {recentEvents.map((event, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0">
                  <Activity className="h-3 w-3 text-gray-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-gray-900">{event.message}</div>
                  <div className="text-xs text-gray-500">
                    {event.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            Activity will appear here as processing begins.
          </div>
        )}
      </div>
    </div>
  );
}
