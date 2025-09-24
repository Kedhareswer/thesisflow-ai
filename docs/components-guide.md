# Components Guide

## Overview
This guide covers the component architecture and organization in ThesisFlow-AI, including the new Support Chat System.

## Directory Structure

```
components/
├── ui/                     # Shadcn/ui base components
├── support/               # Support Chat System (NEW)
│   ├── SupportWidget.tsx  # Main entry point
│   └── SupportPanel.tsx   # Chat interface
├── changelog/             # Changelog components (NEW)
│   └── InfoWidget.tsx     # Release info widget
├── ai-elements/           # AI interaction components
├── analytics/             # Usage analytics components
└── [feature]/            # Feature-specific components
```

## Support Chat System Components

### SupportWidget.tsx
**Purpose**: Main entry point for support chat system
**Location**: `components/support/SupportWidget.tsx`
**Mounting**: Only on home page (`app/page.tsx`)

**Key Features**:
- Floating Action Button (FAB) at bottom-right
- Unread indicator for new broadcasts
- Deep-link support (`/?support=open&prefill=message`)
- Lazy loading to avoid LCP impact
- ESC key and backdrop dismissal

**Props**:
```typescript
interface SupportWidgetProps {
  className?: string
}
```

**Usage**:
```tsx
// Only in app/page.tsx
<SupportWidget />
```

### SupportPanel.tsx
**Purpose**: Main chat interface
**Location**: `components/support/SupportPanel.tsx`
**Lazy Loaded**: Yes, via dynamic import

**Key Features**:
- Header with ThesisFlow-AI branding
- Message history with user/assistant bubbles
- Thumbs up/down feedback system
- Quick reply chips for common actions
- Broadcast banner (dismissible)
- Privacy controls (clear, export, delete)
- Conversation persistence in localStorage

**Props**:
```typescript
interface SupportPanelProps {
  onClose: () => void
  prefillMessage?: string
  onClearPrefill?: () => void
}
```

**State Management**:
- Local React state for UI
- localStorage for persistence
- No server-side storage

### InfoWidget.tsx
**Purpose**: Changelog page integration
**Location**: `components/changelog/InfoWidget.tsx`
**Mounting**: Only on changelog page (`app/changelog/page.tsx`)

**Key Features**:
- Latest release highlights from `data/changelog.json`
- "Ask Support about this release" CTA button
- Deep-link to home page with prefilled chat
- Dismissible with version tracking in localStorage

**Props**:
```typescript
interface InfoWidgetProps {
  className?: string
}
```

## Support System Services

### SupportEngine
**Location**: `lib/services/support-engine.ts`
**Purpose**: Deterministic response generation

**Key Classes**:
```typescript
export class SupportEngine {
  analyzeIntent(input: string): { intent: string; confidence: number }
  generateResponse(intent: string, input: string, state: ConversationState): Promise<SupportResponse>
  generateQuickReplies(intent: string, state: ConversationState): QuickReply[]
}
```

**No AI Dependencies**: Pure rule-based system using keyword matching

## Data Structures

### Knowledge Base
**Location**: `data/support/`

**Files**:
- `intents.json`: Intent definitions and keywords
- `responses/`: Response templates by intent
  - `greeting.json`
  - `pricing.json`
  - `tokens.json`
  - `about.json`
  - `changelog.json`
  - `contact.json`
  - `navigation.json`
  - `account.json`
  - `features_*.json`

### Intent Structure
```typescript
interface Intent {
  name: string
  keywords: string[]
  confidence: number
  priority: number
}
```

### Response Structure
```typescript
interface SupportResponse {
  id: string
  text: string
  quickReplies?: QuickReply[]
  followUp?: string
}
```

### Message Structure
```typescript
interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  intent?: string
  confidence?: number
}
```

## Integration Points

### Home Page Integration
```tsx
// app/page.tsx
import dynamic from "next/dynamic"

const SupportWidget = dynamic(() => import("@/components/support/SupportWidget"), {
  ssr: false
})

export default function HomePage() {
  return (
    <div>
      {/* Page content */}
      <SupportWidget />
    </div>
  )
}
```

### Changelog Page Integration
```tsx
// app/changelog/page.tsx
import InfoWidget from "@/components/changelog/InfoWidget"

export default function ChangelogPage() {
  return (
    <div>
      {/* Hero section */}
      <InfoWidget />
      {/* Changelog content */}
    </div>
  )
}
```

## Styling Guidelines

### Theme Integration
- Uses ThesisFlow-AI brand color: `#FF6B2C`
- Follows existing Tailwind utility patterns
- Responsive design with mobile-first approach
- Consistent with shadcn/ui component styling

### Key Classes
```css
/* Support bubble */
.support-bubble {
  @apply bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 text-white;
}

/* Panel styling */
.support-panel {
  @apply bg-white rounded-lg shadow-2xl border border-gray-200;
}

/* Message bubbles */
.user-message {
  @apply bg-[#FF6B2C] text-white;
}

.assistant-message {
  @apply bg-gray-100 text-gray-900;
}
```

## Performance Considerations

### Lazy Loading
- SupportPanel is dynamically imported
- Only loads when user opens chat
- Prevents impact on initial page load (LCP)

### Bundle Size
- Total support system: ~50KB
- Knowledge base: ~15KB JSON files
- Engine logic: ~20KB TypeScript
- UI components: ~15KB

### Memory Usage
- Minimal state management
- localStorage for persistence
- No memory leaks from event listeners

## Testing Guidelines

### Unit Tests
```typescript
// Test intent classification
describe('SupportEngine', () => {
  it('should classify pricing intent correctly', () => {
    const engine = new SupportEngine()
    const result = engine.analyzeIntent('What are your prices?')
    expect(result.intent).toBe('pricing')
    expect(result.confidence).toBeGreaterThan(0.8)
  })
})
```

### Integration Tests
```typescript
// Test deep-link functionality
describe('SupportWidget', () => {
  it('should open with prefilled message from URL', () => {
    // Mock URL with ?support=open&prefill=test
    // Verify widget opens and input is prefilled
  })
})
```

### E2E Tests
- Test complete conversation flows
- Verify deep-link navigation
- Test persistence across page reloads
- Verify mobile responsive behavior

## Accessibility

### ARIA Support
- Dialog role for chat panel
- Proper focus management
- Screen reader announcements
- Keyboard navigation support

### Keyboard Shortcuts
- `ESC`: Close chat panel
- `Enter`: Send message
- `Tab`: Navigate quick replies
- Arrow keys: Navigate message history

## Analytics Integration

### Event Tracking
```typescript
// Analytics events
'support_open'          // Chat opened
'support_close'         // Chat closed
'support_message'       // Message sent
'support_quick_reply'   // Quick reply clicked
'support_feedback'      // Thumbs up/down
'support_broadcast'     // Broadcast interaction
```

### Data Collection
- No personal data stored
- Anonymous usage patterns
- Performance metrics
- Error tracking

## Maintenance

### Adding New Intents
1. Update `data/support/intents.json`
2. Create response template in `data/support/responses/`
3. Test keyword matching
4. Update documentation

### Updating Responses
1. Modify template files
2. Use placeholders for dynamic content
3. Update quick replies
4. Test conversation flows

### Knowledge Base Expansion
- Monitor user questions for gaps
- Add new response templates
- Expand synonym dictionary
- Improve intent classification
