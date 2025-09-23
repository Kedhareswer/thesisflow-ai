# Support Chat System

## Overview

The Support Chat System is a deterministic, rule-based chatbot that provides intelligent assistance to users on the ThesisFlow-AI platform. It appears exclusively on the home page and offers contextual help about features, pricing, navigation, and platform updates.

## Architecture

### Core Components

#### 1. Support Widget (`components/support/SupportWidget.tsx`)
- **Purpose**: Entry point and bubble interface
- **Location**: Only mounted on home page (`app/page.tsx`)
- **Features**:
  - FAB (Floating Action Button) at bottom-right
  - Unread indicator for new broadcasts
  - Deep-link support (`/?support=open&prefill=message`)
  - Lazy loading to avoid LCP impact
  - ESC key and backdrop dismissal

#### 2. Support Panel (`components/support/SupportPanel.tsx`)
- **Purpose**: Main chat interface
- **Features**:
  - Header with ThesisFlow-AI branding
  - Message history with user/assistant bubbles
  - Thumbs up/down feedback system
  - Quick reply chips for common actions
  - Broadcast banner (dismissible)
  - Privacy controls (clear, export, delete)
  - Conversation persistence in localStorage

#### 3. Support Engine (`lib/services/support-engine.ts`)
- **Purpose**: Deterministic response generation
- **No AI/LLM Dependencies**: Pure rule-based system
- **Features**:
  - Intent classification via weighted keyword matching
  - Synonym support for better matching
  - Response template system
  - Dynamic quick reply generation
  - Confidence scoring and fallbacks

#### 4. Changelog Info Widget (`components/changelog/InfoWidget.tsx`)
- **Purpose**: Bridge between changelog and support
- **Location**: Mounted on `/changelog` page
- **Features**:
  - Latest release highlights
  - "Ask Support about this release" CTA
  - Deep-link to home page with prefilled chat
  - Dismissible with version tracking

## Knowledge Base Structure

### Intent System (`data/support/intents.json`)
```json
{
  "intents": [
    {
      "name": "pricing",
      "keywords": ["price", "pricing", "cost", "plan", "plans"],
      "confidence": 0.9,
      "priority": 2
    }
  ],
  "synonyms": {
    "thesisflow": ["thesis flow", "thesisflow-ai"],
    "pricing": ["cost", "price", "billing"]
  }
}
```

### Response Templates (`data/support/responses/`)
- **greeting.json**: Welcome messages and initial quick replies
- **pricing.json**: Plan information and token explanations
- **tokens.json**: Detailed token usage and limits
- **about.json**: Platform overview and feature descriptions
- **changelog.json**: Latest updates and release information
- **contact.json**: Support contact information
- **navigation.json**: Platform navigation help
- **account.json**: Account management assistance
- **features_*.json**: Specific feature explanations

## User Experience Flow

### 1. Initial Interaction
```
User visits home page → Sees support bubble → Clicks bubble → 
Opens with greeting → Shows contextual quick replies
```

### 2. Intent Classification
```
User types message → Engine analyzes keywords → 
Matches to intent → Selects response template → 
Renders with dynamic content → Shows relevant quick replies
```

### 3. Deep-Link Flow
```
User on changelog → Clicks "Ask Support" → 
Redirects to /?support=open&prefill=message → 
Chat opens automatically → Message prefilled → 
User can send or modify
```

## Technical Implementation

### Mounting Strategy
- **Home Only**: Widget only rendered in `app/page.tsx`
- **Lazy Loading**: Dynamic import to avoid LCP impact
- **Route Guard**: No mounting on other pages/layouts

### State Management
- **Local State**: React useState for UI state
- **Persistence**: localStorage for conversation history
- **Privacy**: User-controlled data deletion

### Analytics Integration
- **Events**: open, close, send, receive, quick_reply, feedback
- **Provider**: Google Analytics (gtag)
- **Privacy**: Respects user preferences

## Configuration

### Environment Variables
None required - fully client-side system

### Customization Points
1. **Intent Keywords**: Modify `data/support/intents.json`
2. **Response Templates**: Update files in `data/support/responses/`
3. **Broadcast Messages**: Hardcoded in SupportPanel component
4. **Styling**: ThesisFlow-AI orange (#FF6B2C) theme

## Security Considerations

### Data Privacy
- **Local Storage**: All data stored client-side
- **No Server Persistence**: No conversation data sent to servers
- **User Control**: Clear, export, delete options available

### Content Security
- **No External Calls**: No AI/LLM API dependencies
- **Deterministic**: All responses from local templates
- **Input Sanitization**: Basic text processing only

## Performance

### Bundle Impact
- **Lazy Loading**: Panel code split and loaded on demand
- **Small Footprint**: ~50KB total (engine + templates)
- **LCP Safe**: No impact on initial page load

### Runtime Performance
- **Fast Response**: Instant intent classification
- **Memory Efficient**: Minimal state management
- **Mobile Optimized**: Responsive design patterns

## Maintenance

### Adding New Intents
1. Add intent definition to `intents.json`
2. Create response template in `responses/`
3. Update Support Engine if needed
4. Test keyword matching

### Updating Responses
1. Modify template files in `data/support/responses/`
2. Use placeholders for dynamic content
3. Update quick replies as needed
4. Test conversation flows

### Analytics Review
- Monitor event data for usage patterns
- Identify common user questions
- Optimize intent classification
- Expand knowledge base as needed

## Future Enhancements

### Phase 2 Possibilities
- **RAG Integration**: Add embeddings for doc search
- **Form Support**: Contact forms and bug reports
- **Multi-language**: i18n support
- **Advanced Analytics**: Conversation analysis
- **Human Handoff**: Escalation to support team

### Scalability
- **Server-side Engine**: Move processing to API routes
- **Database Storage**: Persistent conversation history
- **Admin Interface**: Content management system
- **A/B Testing**: Response optimization

## Troubleshooting

### Common Issues
1. **Widget Not Appearing**: Check home page mounting
2. **Deep Links Not Working**: Verify URL parameter parsing
3. **Intent Misclassification**: Review keyword matching
4. **Persistence Issues**: Check localStorage availability

### Debug Tools
- Browser console logs for intent classification
- localStorage inspection for conversation data
- Network tab for any unexpected requests
- React DevTools for component state
