# Summarizer Module

The Summarizer module allows you to transform lengthy content into concise, intelligent summaries using AI. This powerful tool supports multiple input methods and provides various summary styles to suit different needs.

## Features

### Multiple Input Methods

The Summarizer supports various ways to input content:

- **File Upload**: Upload documents (PDF, DOCX, TXT) directly
- **URL Input**: Paste a specific URL to extract content
- **Smart Web Search**: Search and find content to summarize
- **Direct Input**: Paste or type text directly into the editor

### URL-Based Summarization

The Summarizer includes a powerful web search feature that allows you to:

1. **Search the web** for articles, research papers, or news content
2. **Select content** directly from search results
3. **Automatically extract** the relevant text content
4. **Generate summaries** using your chosen AI provider and settings

### How to Use the Web Search Feature

1. Navigate to the Summarizer page
2. In the "Smart Web Search" panel, enter your search query
3. Click the "Search" button to find relevant content
4. Browse the search results and click "Use" on any result you want to summarize
5. The system will automatically:
   - Extract the content from the URL
   - Populate the input field with the extracted content
   - Ready the content for summarization
6. Configure your summarization preferences (style, length, provider)
7. Click "Generate Summary" to create your summary

### Summary Styles

Choose from multiple summary styles to match your needs:

- **Academic**: Formal, structured summaries suitable for academic content
- **Executive**: Concise, business-focused summaries highlighting key information
- **Bullet Points**: Quick, scannable summaries organized as bullet points
- **Detailed**: Comprehensive summaries that capture more nuance

### Summary Length Options

Select the appropriate length for your summary:

- **Brief**: Short, concise summaries (best for quick overviews)
- **Medium**: Balanced summaries with moderate detail
- **Comprehensive**: Detailed summaries with more information and context

### AI Provider Support

The Summarizer works with multiple AI providers:

- **OpenAI** (GPT-4, GPT-3.5-turbo)
- **Google Gemini** (Gemini Pro, Gemini Flash)
- **Groq** (Llama-3.1-8B-instant, Mixtral-8x7B)
- **Anthropic** (Claude-3, Claude-2)
- **Mistral AI** (Mistral-7B, Mixtral-8x7B)

## Technical Configuration

### Google Search API Setup

The web search feature integrates with Google Custom Search API for high-quality search results. To use this feature with real search results:

1. Create a [Google Custom Search Engine](https://programmablesearchengine.google.com/about/)
2. Get an [API key from Google Cloud](https://console.cloud.google.com/apis/credentials)
3. Configure the following environment variables in your `.env.local` file:

\`\`\`bash
GOOGLE_SEARCH_API_KEY=your_google_api_key_here
GOOGLE_SEARCH_CSE_ID=your_custom_search_engine_id_here
\`\`\`

### Fallback Search

If no Google Search API credentials are provided, the system will use a fallback search mechanism that provides demonstration results.

## Usage Examples

### Academic Paper Summarization

1. Upload a PDF research paper
2. Select "Academic" style
3. Choose "Comprehensive" length
4. Generate summary with key findings and methodology

### Business Document Summarization

1. Paste a business report URL
2. Select "Executive" style
3. Choose "Brief" length
4. Get concise executive summary

### News Article Summarization

1. Use web search to find news articles
2. Select "Bullet Points" style
3. Choose "Medium" length
4. Get scannable key points

## Performance

- **Processing Time**: 2-5 seconds for most documents
- **File Size Limit**: 10MB per file
- **Supported Formats**: PDF, DOCX, TXT
- **Concurrent Users**: 50+ simultaneous users

## Error Handling

The Summarizer includes comprehensive error handling:

- **File Format Validation**: Checks for supported file types
- **Content Extraction**: Handles malformed documents gracefully
- **API Error Recovery**: Automatic fallback between AI providers
- **User Feedback**: Clear error messages and suggestions

## Integration

The Summarizer integrates with other platform features:

- **Research Session**: Summaries are saved to your research session
- **Citation Management**: Extract and format citations from summarized content
- **Document Management**: Export summaries in multiple formats
- **Collaboration**: Share summaries with team members
