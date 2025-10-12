# Nova AI Setup Guide

## Required Environment Variable

ThesisFlow AI uses **Nova AI** (powered by Groq with Llama-3.3-70B) for all report generation and AI features.

### Nova AI (Groq API) - Required

```bash
GROQ_API_KEY=gsk_your_groq_api_key_here
```

**Getting your Groq API Key:**
1. Visit https://console.groq.com/keys
2. Create a free account
3. Generate an API key
4. Copy the key and add it to your environment variables

**Model Used:** llama-3.3-70b-versatile
- High-quality reasoning and analysis
- Optimized for academic and research tasks
- Fast inference with reliable results
- Free tier available

## Environment File Setup

Create a `.env.local` file in your project root:

```bash
# Required: Nova AI (Groq) API Key
GROQ_API_KEY=gsk_your_groq_api_key_here
```

## Troubleshooting

If you see errors like "Nova AI not configured" or "Groq API error":

1. **Check your GROQ_API_KEY** - Make sure it's set correctly
2. **Restart your development server** after adding the environment variable
3. **Verify API key validity** - Test your key at https://console.groq.com/
4. **Check API key format** - Should start with 'gsk_'

## Testing Your Setup

After adding the Groq API key:

1. **Restart your development server**
2. **Navigate to the Topics page**
3. **Search for any topic** (e.g., "machine learning interpretability")
4. **Click "Generate Report"** - should now work without errors

The system uses Nova AI for all three stages:
- **Curation**: Evaluates source credibility and trust levels
- **Analysis**: Creates detailed summaries for each source  
- **Synthesis**: Generates the final scholarly review

## Benefits of Nova AI (Groq)

- **Optimized for research**: Uses Llama-3.3-70B specifically tuned for academic tasks
- **Reliable**: Single provider eliminates complex fallback logic
- **Fast**: High-performance inference with consistent results
- **Free**: Generous free tier for development and research use
- **Proven**: Groq provides some of the fastest LLM inference available
