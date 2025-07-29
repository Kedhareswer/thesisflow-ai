# Summarizer Module

The Summarizer module allows you to transform lengthy content into concise, intelligent summaries using AI.

## Features

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

### Input Methods

The Summarizer supports multiple ways to input content:

- **File Upload**: Upload documents (PDF, DOCX, TXT)
- **URL Input**: Paste a specific URL to extract content
- **Smart Web Search**: Search and find content to summarize
- **Direct Input**: Paste or type text directly

### Summary Styles

- **Academic**: Formal, structured summaries suitable for academic content
- **Executive**: Concise, business-focused summaries highlighting key information
- **Bullet Points**: Quick, scannable summaries organized as bullet points
- **Detailed**: Comprehensive summaries that capture more nuance

### Summary Length

- **Brief**: Short, concise summaries (best for quick overviews)
- **Medium**: Balanced summaries with moderate detail
- **Comprehensive**: Detailed summaries with more information and context

## Technical Notes

The web search feature integrates with Google Custom Search API for high-quality search results. To use this feature with real search results:

1. Create a [Google Custom Search Engine](https://programmablesearchengine.google.com/about/)
2. Get an [API key from Google Cloud](https://console.cloud.google.com/apis/credentials)
3. Configure the following environment variables in your `.env.local` file:
   \`\`\`
   GOOGLE_SEARCH_API_KEY=your_google_api_key_here
   GOOGLE_SEARCH_CSE_ID=your_custom_search_engine_id_here
   \`\`\`

If no Google Search API credentials are provided, the system will use a fallback search mechanism that provides demonstration results.
