# Design Document

## Overview

This design addresses critical issues in the Summarizer feature that prevent proper functionality. The main problems identified are:

1. **API Response Mismatch**: The AI generate endpoint returns `response` but the Summarizer expects `content`
2. **Inadequate PDF Processing**: The extract-file endpoint has basic PDF extraction that often fails
3. **Poor Error Handling**: Generic error messages without actionable guidance
4. **Missing Fallback Mechanisms**: No graceful degradation when services fail
5. **Inconsistent File Processing**: Different file types handled inconsistently

## Architecture

### Current Flow Issues
```
User Input → File/URL Processing → AI API Call → Response Parsing → Display
     ↑              ↑                   ↑             ↑            ↑
   Works        Partially         Mismatch      Fails        Broken
                 Works            Response      Often
```

### Improved Flow
```
User Input → Enhanced Processing → Normalized API → Robust Parsing → Rich Display
     ↑              ↑                     ↑             ↑              ↑
  Validated    Reliable with         Consistent      Error-Resilient   Enhanced
              Fallbacks             Response         with Fallbacks    Feedback
```

## Components and Interfaces

### 1. API Response Normalization

**Problem**: AI generate endpoint returns `{ response: string }` but Summarizer expects `{ content: string }`

**Solution**: Update the AI generate endpoint to return both fields for backward compatibility:

```typescript
// Current response
{ success: true, response: string, usage: object }

// New response (backward compatible)
{ success: true, response: string, content: string, usage: object }
```

**Alternative**: Update Summarizer to use `response` field instead of `content`

### 2. Enhanced File Processing

**Current Issues**:
- PDF extraction is primitive (byte-by-byte ASCII extraction)
- Missing proper PDF parsing libraries
- No fallback for complex documents

**Solution**: Implement tiered PDF processing:

```typescript
interface PDFProcessor {
  // Tier 1: Try pdf-parse library (server-side)
  extractWithLibrary(file: File): Promise<string>
  
  // Tier 2: Use external service (if available)
  extractWithService(file: File): Promise<string>
  
  // Tier 3: Basic text extraction (current method)
  extractBasic(file: File): Promise<string>
  
  // Tier 4: Provide helpful guidance
  provideFallbackGuidance(file: File): string
}
```

### 3. Robust Error Handling System

**Current**: Generic error messages
**New**: Contextual error handling with actionable guidance

```typescript
interface ErrorHandler {
  handleAPIError(error: APIError): UserFriendlyError
  handleFileError(error: FileError): UserFriendlyError
  handleNetworkError(error: NetworkError): UserFriendlyError
  provideActionableGuidance(errorType: string): string[]
}

interface UserFriendlyError {
  title: string
  message: string
  actions: string[]
  fallbackOptions?: string[]
  helpLinks?: string[]
}
```

### 4. Content Processing Pipeline

**Enhanced chunking strategy**:
- Intelligent content splitting (preserve paragraphs/sections)
- Context preservation between chunks
- Progressive summarization for very large content

```typescript
interface ContentProcessor {
  analyzeContent(content: string): ContentAnalysis
  chunkContent(content: string, strategy: ChunkingStrategy): ContentChunk[]
  processChunks(chunks: ContentChunk[]): Promise<ProcessedChunk[]>
  synthesizeResults(chunks: ProcessedChunk[]): SummaryResult
}
```

## Data Models

### Enhanced SummaryResult
```typescript
interface SummaryResult {
  summary: string
  keyPoints: string[]
  readingTime: number
  sentiment?: "positive" | "neutral" | "negative"
  originalLength: number
  summaryLength: number
  compressionRatio: string
  topics?: string[]
  difficulty?: "beginner" | "intermediate" | "advanced"
  tables?: TableData[]
  graphs?: GraphData[]
  
  // New fields for better user experience
  processingMethod: "direct" | "chunked" | "fallback"
  confidence: number
  warnings?: string[]
  suggestions?: string[]
}
```

### Error Response Model
```typescript
interface ErrorResponse {
  error: string
  errorType: "api" | "file" | "network" | "validation"
  userMessage: string
  actions: string[]
  fallbackOptions?: string[]
  technicalDetails?: string
}
```

## Error Handling

### 1. API Response Errors
- **Issue**: Mismatched field names
- **Solution**: Normalize response handling to check both `response` and `content` fields
- **Fallback**: Provide clear error message if neither field exists

### 2. File Processing Errors
- **Issue**: Poor PDF extraction, missing libraries
- **Solution**: Implement tiered processing with multiple fallback methods
- **User Guidance**: Suggest alternative tools (QuantumPDF) for complex documents

### 3. Network and Timeout Errors
- **Issue**: Generic timeout messages
- **Solution**: Implement retry logic with exponential backoff
- **User Feedback**: Show progress and retry attempts

### 4. AI Provider Errors
- **Issue**: Single provider failure breaks entire flow
- **Solution**: Automatic fallback to alternative providers
- **User Control**: Allow manual provider selection

## Testing Strategy

### 1. Unit Tests
- API response parsing with various response formats
- File processing with different file types and sizes
- Error handling for each error scenario
- Content chunking and synthesis logic

### 2. Integration Tests
- End-to-end summarization flow
- File upload and processing pipeline
- URL content extraction
- AI provider fallback mechanisms

### 3. Error Scenario Tests
- Network failures and timeouts
- Invalid file formats
- Corrupted files
- API key issues
- Rate limiting scenarios

### 4. Performance Tests
- Large file processing
- Content chunking efficiency
- Memory usage during processing
- Response time optimization

## Implementation Priorities

### Phase 1: Critical Fixes (High Priority)
1. Fix API response field mismatch
2. Improve PDF processing with proper error handling
3. Add comprehensive error messages with actionable guidance

### Phase 2: Enhanced Reliability (Medium Priority)
1. Implement provider fallback mechanisms
2. Add intelligent content chunking
3. Improve file processing with multiple extraction methods

### Phase 3: User Experience (Lower Priority)
1. Add progress indicators for long operations
2. Implement retry mechanisms with user feedback
3. Add advanced configuration options

## Security Considerations

1. **File Upload Security**: Validate file types and sizes before processing
2. **Content Sanitization**: Clean extracted content to prevent XSS
3. **API Key Protection**: Ensure API keys are not exposed in error messages
4. **Rate Limiting**: Implement proper rate limiting for API calls

## Performance Optimizations

1. **Lazy Loading**: Load file processing libraries only when needed
2. **Caching**: Cache processed content for repeated operations
3. **Streaming**: Stream large file processing results
4. **Compression**: Compress large content before API calls