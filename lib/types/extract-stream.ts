/**
 * Extract Data v2 - Streaming types and contracts
 * Used by SSE routes and client hooks for real-time extraction
 */

export type ExtractPhase =
  | 'uploading' 
  | 'queued' 
  | 'parsing' 
  | 'analyzing'
  | 'tables' 
  | 'entities' 
  | 'citations' 
  | 'summarizing' 
  | 'completed' 
  | 'failed';

// Extraction streaming events
export interface StreamInitEvent {
  sessionId: string;
  files: Array<{ 
    fileId: string; 
    name: string; 
    size: number; 
    type?: string;
  }>;
}

export interface StreamProgressEvent {
  fileId: string;
  pct: number;            // 0..100
  phase: ExtractPhase;    // current processing step
  message?: string;       // brief status message
}

export interface StreamParseEvent {
  fileId: string;
  metadata: { 
    wordCount?: number; 
    pageCount?: number; 
    fileType?: string; 
    ocr?: boolean;
  };
  preview?: string;       // safe text excerpt (first 2-3k chars)
}

export interface StreamTablesEvent {
  fileId: string;
  count: number;
  sample?: { 
    headers: string[]; 
    rows: string[][];
  }; // small preview table
}

export interface StreamEntitiesEvent {
  fileId: string;
  count: number;
  sample?: Array<{ 
    type: string; 
    value: string; 
    count?: number;
  }>;
}

export interface StreamCitationsEvent {
  fileId: string;
  items: Array<{ 
    kind: 'doi' | 'url' | 'ref'; 
    value: string; 
    title?: string;
  }>;
}

export interface StreamInsightEvent {
  fileId: string;
  summary: string;
  keyPoints: string[];
  aiSummarySource?: 'openrouter' | 'heuristic';
}

export interface StreamDoneEvent {
  fileId: string;
  extractionId: string;
}

export interface StreamErrorEvent {
  fileId?: string;
  message: string;
  recoverable?: boolean;
}

// Chat streaming types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatInitEvent { 
  model: string; 
  provider: string;
}

export interface ChatTokenEvent { 
  token: string;
}

export interface ChatProgressEvent { 
  message: string; // reasoning/progress lines
}

export interface ChatDoneEvent { 
  usage?: { 
    tokens?: number;
  };
}

export interface ChatErrorEvent { 
  message: string;
}

// Unified stream event types
export type ExtractionStreamEvent = 
  | { type: 'init'; data: StreamInitEvent }
  | { type: 'progress'; data: StreamProgressEvent }
  | { type: 'parse'; data: StreamParseEvent }
  | { type: 'tables'; data: StreamTablesEvent }
  | { type: 'entities'; data: StreamEntitiesEvent }
  | { type: 'citations'; data: StreamCitationsEvent }
  | { type: 'insight'; data: StreamInsightEvent }
  | { type: 'done'; data: StreamDoneEvent }
  | { type: 'error'; data: StreamErrorEvent }
  | { type: 'ping'; data: {} };

export type ChatStreamEvent = 
  | { type: 'init'; data: ChatInitEvent }
  | { type: 'token'; data: ChatTokenEvent }
  | { type: 'progress'; data: ChatProgressEvent }
  | { type: 'done'; data: ChatDoneEvent }
  | { type: 'error'; data: ChatErrorEvent }
  | { type: 'ping'; data: {} };

// Client state interfaces
export interface ExtractionStreamState {
  isStreaming: boolean;
  sessionId?: string;
  files: Array<{
    fileId: string;
    name: string;
    size: number;
    phase: ExtractPhase;
    progress: number;
    error?: string;
    extractionId?: string;
  }>;
  insights: Array<{
    fileId: string;
    summary: string;
    keyPoints: string[];
  }>;
  timeline: Array<{
    timestamp: Date;
    fileId?: string;
    phase: ExtractPhase;
    message: string;
  }>;
  error?: string;
}

export interface ChatStreamState {
  isStreaming: boolean;
  messages: ChatMessage[];
  currentResponse: string;
  error?: string;
  usage?: { tokens?: number };
}
