# Plagiarism Detection Setup Guide

## Overview
The enhanced plagiarism detection system provides real-time, accurate plagiarism checking with external source verification, semantic analysis, and result caching.

## Required Environment Variables

Add the following to your `.env.local` file:

```env
# OpenAI API Key (Required for semantic analysis)
OPENAI_API_KEY=your_openai_api_key_here

# Google Custom Search API (Optional but recommended)
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_CX=your_google_custom_search_engine_id_here

# Bing Search API (Optional)
BING_API_KEY=your_bing_search_api_key_here

# Supabase (Required - should already be configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Getting API Keys

### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy and save securely

### Google Custom Search
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Custom Search API
4. Create credentials (API Key)
5. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/)
6. Create a new search engine
7. Get your Search Engine ID (cx)

### Bing Search API
1. Go to [Azure Portal](https://portal.azure.com/)
2. Create a Bing Search resource
3. Get your API key from the Keys section

## Database Setup

Run the following SQL in your Supabase SQL Editor:

1. Navigate to your Supabase project
2. Go to SQL Editor
3. Run the contents of `scripts/plagiarism-checks-schema.sql`

## Features

### 1. Multi-Algorithm Detection
- **K-Shingle Fingerprinting**: Detects structural similarities
- **Phrase Matching**: Identifies exact and near-duplicate phrases
- **Semantic Analysis**: Uses AI embeddings to detect paraphrasing
- **Citation Pattern Analysis**: Evaluates academic citation usage
- **Structural Analysis**: Examines document structure and formatting

### 2. External Source Checking
- Web search via Google, Bing, or DuckDuckGo
- Academic source verification
- Real-time web scraping for content comparison
- Deduplication of found sources

### 3. Caching System
- Results cached for 24 hours
- User-specific and anonymous caching
- Reduces API costs and improves performance

### 4. Confidence Scoring
- Quantifies reliability of detection
- Based on multiple factors:
  - Number of algorithms triggered
  - External sources found
  - Semantic analysis results
  - Input text length

## Usage

### Basic Check
```typescript
const response = await fetch('/api/plagiarism', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: documentContent })
})
const result = await response.json()
```

### Advanced Check with Options
```typescript
const response = await fetch('/api/plagiarism', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: documentContent,
    options: {
      checkExternal: true,        // Check external web sources (default: true)
      useSemanticAnalysis: true,  // Use AI for semantic similarity (default: false)
      documentId: 'doc-123'       // Optional document ID for tracking
    }
  })
})
```

## Response Format

```typescript
{
  detected: boolean,              // Is plagiarism detected?
  percentage: number,             // Overall similarity percentage (0-100)
  confidence_score: number,       // Confidence in the result (0-1)
  check_id: string,              // Unique check identifier
  matches: MatchDetail[],        // Detailed match information
  suspicious_sections: Section[], // Suspicious text sections
  external_sources: Source[],    // External sources found
  semantic_analysis: {           // Semantic analysis results
    embedding_similarity: number,
    paraphrase_detected: boolean,
    semantic_matches: Match[]
  },
  fingerprint: string,           // Document fingerprint
  analysis_details: {            // Detailed analysis metrics
    total_words: number,
    unique_phrases: number,
    algorithms_used: string[]
  },
  timestamp: string              // Check timestamp
}
```

## Performance Considerations

1. **Text Length**: Optimal for 50-50,000 characters
2. **API Rate Limits**: External APIs have rate limits
3. **Caching**: Results cached for 24 hours
4. **Batch Processing**: Large documents processed in chunks

## Cost Optimization

1. **Use Caching**: Cached results avoid repeated API calls
2. **Selective External Checking**: Disable for internal-only checks
3. **Semantic Analysis**: Enable only when needed (uses OpenAI tokens)
4. **DuckDuckGo Fallback**: Free alternative when paid APIs unavailable

## Security

1. **API Keys**: Store securely in environment variables
2. **Row Level Security**: Database policies protect user data
3. **Rate Limiting**: Implement rate limiting for production
4. **Input Validation**: Text length and type validation

## Troubleshooting

### Missing Dependencies
```bash
# Install required packages
npm install axios cheerio openai
# or
pnpm add axios cheerio openai
```

### API Key Issues
- Verify keys are correctly set in `.env.local`
- Check API key permissions and quotas
- Ensure billing is enabled for paid APIs

### Database Errors
- Run the schema SQL in Supabase
- Check RLS policies are enabled
- Verify Supabase connection

## Support
For issues or questions, check the project documentation or open an issue on GitHub.
