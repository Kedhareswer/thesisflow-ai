# Summarizer Components

## SmartWebSearchPanel

A comprehensive web search component that provides intelligent content discovery with advanced features.

### Features

- **Search Query Input**: Auto-complete suggestions based on search history
- **Search Results Display**: Clean, organized results with content previews
- **Result Selection**: One-click integration with URL processing pipeline
- **Search History**: Automatic tracking of recent searches with timestamps
- **Saved Searches**: Bookmark frequently used searches for quick access
- **Error Handling**: User-friendly error messages with actionable guidance

### Usage

```tsx
import { SmartWebSearchPanel, type SearchResult } from './smart-web-search-panel'

function MyComponent() {
  const handleResultSelect = (result: SearchResult) => {
    // Handle the selected search result
    console.log('Selected:', result.title, result.url)
  }

  return (
    <SmartWebSearchPanel
      onResultSelect={handleResultSelect}
      placeholder="Search for topics, articles, research papers..."
      maxResults={8}
      showHistory={true}
      showSavedSearches={true}
    />
  )
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onResultSelect` | `(result: SearchResult) => void` | Required | Callback when user selects a search result |
| `className` | `string` | `""` | Additional CSS classes |
| `placeholder` | `string` | `"Search for topics..."` | Input placeholder text |
| `maxResults` | `number` | `10` | Maximum number of results to display |
| `showHistory` | `boolean` | `true` | Show search history panel |
| `showSavedSearches` | `boolean` | `true` | Show saved searches panel |

### SearchResult Interface

```tsx
interface SearchResult {
  title: string      // Result title
  url: string        // Result URL
  description: string // Result description/snippet
  source: string     // Source domain/site name
}
```

### Local Storage

The component automatically manages:
- **Search History**: `summarizer_search_history` (last 20 searches)
- **Saved Searches**: `summarizer_saved_searches` (up to 10 saved)

### Integration with Input Tab

The SmartWebSearchPanel is integrated into the Input tab as the "Web Search" input method. When a user selects a search result, it automatically:

1. Sets the URL in the URL input field
2. Triggers the URL fetch process
3. Integrates with the existing URL processing pipeline

### API Integration

Uses the `/api/search/web` endpoint which supports:
- Google Custom Search API (if configured)
- Fallback mock search results for development
- Comprehensive error handling with user-friendly messages

### Accessibility

- Full keyboard navigation support
- Screen reader friendly with proper ARIA labels
- Focus management for search suggestions
- High contrast support

### Performance

- Debounced search suggestions
- Efficient localStorage operations
- Optimized re-rendering with proper React patterns
- Lazy loading of search history and saved searches