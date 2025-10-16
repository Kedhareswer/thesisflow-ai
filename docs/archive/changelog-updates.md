# Recent Updates - Nova AI Integration

## v2.4.3 - TopicExplorer Component Cleanup (2025-10-12)

### 🧹 Code Cleanup

Following v2.4.2's complete Nebius to Groq migration, this release cleans up the TopicExplorer component to fully align with the single-provider (Nova AI/Groq) architecture.

#### Component Simplification
- **Removed Unused Provider/Model Parameters**: Updated `TopicExplorer.tsx` to remove all multi-provider parameter handling
  - Simplified `exploreTopics()` method signature - removed `selectedProvider` and `selectedModel` parameters
  - Removed unused state variables `localProvider` and `localModel`
  - Cleaned up component props interface and callback dependencies
  - Updated comment from "uses user API keys" to "using Nova AI (Groq) exclusively"

#### Impact
- Cleaner, more maintainable code in Explorer page
- Reduced complexity by removing dead code paths
- Fully aligned with single-provider architecture

### 🛠️ Files Modified
- `app/explorer/components/TopicExplorer.tsx` - Complete provider/model parameter removal
- `docs/changelog-updates.md` - Added v2.4.3 entry
- `docs/AI_CLEANUP_SUMMARY.md` - Updated with v2.4.3 cleanup details

---

## v2.4.2 - Complete Nebius to Groq Migration (2025-10-12)

### 🚀 Critical Bug Fixes

Following v2.4.0's user API key removal and v2.4.1's initial cleanup, this release completes the migration from Nebius API to Groq API and fixes all broken provider configuration checks.

#### API Fixes
- **Fixed Collaborate Page**: Updated `lib/services/nova-ai.service.ts` to use Groq API instead of Nebius
  - Changed API endpoint from `https://api.studio.nebius.com/v1/chat/completions` to `https://api.groq.com/openai/v1/chat/completions`
  - Updated model from `meta-llama/Llama-3.3-70B-Instruct-fast` to `llama-3.3-70b-versatile`
  - Changed environment variable from `NEBIUS_API_KEY` to `GROQ_API_KEY`
  - Fixed all 3 API call locations: `processMessage()`, `processMessageStream()`, `getSuggestions()`

- **Fixed Explorer Page**: Added missing `generateResearchIdeas()` method to `lib/enhanced-ai-service.ts`
  - Implemented complete research idea generation with JSON response parsing
  - Added fallback parser for non-JSON responses
  - Proper TypeScript types matching component expectations

#### Provider Configuration Fixes
- **Fixed `lib/ai-provider-detector.ts`**: Updated `getClientAvailableProviders()` to return `['groq']` directly instead of calling removed `/api/ai/providers` route
- **Fixed `lib/ai-config.ts`**: Simplified all methods for single-provider architecture
  - `getAvailableProviders()`: Always returns `['groq']`
  - `getBestProvider()`: Always returns `'groq'`
  - `getProviderStatus()`: Returns Nova AI status message
  - Updated display name from "Groq (Fast)" to "Nova AI (Groq)"

#### Pages Verified
- ✅ **Explorer**: Uses `enhancedAIService.generateText()` and `generateResearchIdeas()` - working correctly
- ✅ **Planner**: Uses Nova AI via `/api/plan-and-execute` POST endpoint - working correctly
- ✅ **Collaborate**: Uses `NovaAIService` via Groq API - working correctly

### 📊 Impact
All AI features now correctly use the Groq API (branded as "Nova AI") with no references to removed APIs or Nebius endpoints. The "No AI providers configured" and "Nebius API error" messages have been eliminated.

### 🛠️ Files Modified
- `lib/services/nova-ai.service.ts` - Complete Nebius to Groq migration
- `lib/enhanced-ai-service.ts` - Added `generateResearchIdeas()` method
- `lib/ai-provider-detector.ts` - Simplified for single provider
- `lib/ai-config.ts` - Simplified for single provider
- `README.md` - Updated AI architecture documentation
- `docs/changelog-updates.md` - Added v2.4.2 entry
- `docs/AI_CLEANUP_SUMMARY.md` - Updated with v2.4.2 fixes

---

## v2.3.0 - Nova AI Simplification (2025-01-07)

### 🚀 Major Architecture Simplification

#### Nova AI Integration
- **Single AI Provider**: Replaced complex multi-provider system with Nova AI (Llama-3.3-70B) exclusively
- **Simplified Configuration**: Only requires `GROQ_API_KEY` - no more complex provider selection
- **Research-Optimized**: Nova AI specifically tuned for academic and research tasks
- **Reliable Performance**: Eliminates provider fallback complexity and timeout issues
- **Cost Transparency**: Clear Nova AI usage tracking in plan analytics with cost breakdown

#### User Experience Improvements  
- **Removed Provider Selection**: No more confusing AI provider/model dropdowns in UI
- **Consistent AI Experience**: Same Nova AI across all features (Research Assistant, Writing, Topics, etc.)
- **Clear Status Indicators**: Green Nova AI status badges throughout the platform
- **Simplified Settings**: Removed AI configuration tabs - users see Nova AI status only

#### Technical Benefits
- **Faster Response Times**: Direct Nova AI integration without routing overhead
- **Better Error Handling**: Simplified error messages and graceful fallbacks  
- **Reduced Complexity**: Removed `ai-providers.ts`, `enhanced-ai-service.ts` complexity
- **Production Ready**: Single proven provider with enterprise-grade reliability

### 🛠️ Files Modified
- **Settings Page** (`/settings`): Removed AI Settings tab, added Nova AI status
- **Research Assistant**: Direct Nova AI integration with clean UI
- **Plan Analytics** (`/plan`): Nova AI cost tracking and usage visualization
- **All AI Components**: Unified Nova AI experience across Explorer, Writer, Extract
- **Documentation**: Updated setup guides to show Nova AI requirements only

## v2.2.0 - Support Chat System (2025-09-24)

### 🚀 New Features

#### Support Chat System
- **Home-Only Chat Widget**: Floating action button appears exclusively on the home page
- **Deterministic AI**: Rule-based chatbot with no external AI/LLM dependencies
- **Intelligent Intent Classification**: Keyword-based matching with confidence scoring
- **Comprehensive Knowledge Base**: Covers pricing, tokens, features, navigation, and updates
- **Quick Reply System**: Contextual suggestion chips for common actions
- **Conversation Persistence**: localStorage-based chat history with privacy controls
- **Feedback System**: Thumbs up/down rating on assistant responses
- **Deep-Link Support**: URL parameters to open chat with prefilled messages
- **Broadcast System**: Dismissible announcements within chat interface

#### Changelog Integration
- **Info Widget**: Highlights latest releases on changelog page
- **Support Bridge**: "Ask Support about this release" CTA button
- **Cross-Page Navigation**: Deep-links from changelog to home page support chat
- **Version Tracking**: Dismissible widgets with localStorage persistence

### 🛠️ Technical Implementation

#### Components Added
- `components/support/SupportWidget.tsx` - Main entry point and FAB
- `components/support/SupportPanel.tsx` - Full chat interface
- `components/changelog/InfoWidget.tsx` - Release highlights widget
- `lib/services/support-engine.ts` - Deterministic response engine

#### Knowledge Base Structure
- `data/support/intents.json` - Intent definitions and keywords
- `data/support/responses/` - Response templates by topic:
  - `greeting.json` - Welcome messages
  - `pricing.json` - Plan and billing information
  - `tokens.json` - Usage and limits explanation
  - `about.json` - Platform overview
  - `changelog.json` - Latest updates
  - `contact.json` - Support information
  - `navigation.json` - Platform guidance
  - `account.json` - Account management
  - `features_*.json` - Feature-specific help

#### Performance Optimizations
- **Lazy Loading**: Support panel dynamically imported to avoid LCP impact
- **Bundle Splitting**: ~50KB total footprint with code splitting
- **Memory Efficient**: Minimal state management with localStorage persistence
- **Mobile Optimized**: Responsive design with bottom sheet on mobile

### 🎯 User Experience

#### Conversation Flow
1. **Entry**: Click support bubble on home page
2. **Greeting**: Automatic welcome with quick reply options
3. **Intent Recognition**: Smart classification of user questions
4. **Contextual Responses**: Relevant answers with follow-up suggestions
5. **Feedback Loop**: Rate responses and get better suggestions

#### Deep-Link Examples
- `/?support=open` - Opens chat automatically
- `/?support=open&prefill=pricing` - Opens with prefilled message
- From changelog: "Ask Support about this release" → Auto-opens with version-specific question

#### Privacy Controls
- **Clear Conversation**: Remove all chat history
- **Export Conversation**: Download chat as JSON
- **Delete My Data**: Complete data removal from localStorage

### 📊 Analytics Integration

#### Event Tracking
- `support_open` - Chat widget opened
- `support_close` - Chat widget closed
- `support_message` - User sent message
- `support_quick_reply` - Quick reply button clicked
- `support_feedback` - Thumbs up/down given
- `support_broadcast` - Broadcast banner interaction
- `changelog_support_cta` - Changelog CTA clicked

### 🔧 Developer Experience

#### Documentation Added
- `docs/support-chat-system.md` - Complete system documentation
- `docs/components-guide.md` - Component architecture guide
- Updated `docs/frontend.md` with new components
- Updated `docs/design-architecture.md` with support system

#### Maintenance Features
- **Intent Management**: Easy addition of new intents via JSON
- **Response Templates**: Modular response system with placeholders
- **Keyword Expansion**: Synonym support for better matching
- **Debug Tools**: Console logging for intent classification

### 🚦 Quality Assurance

#### Accessibility
- **ARIA Support**: Proper dialog roles and screen reader support
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Proper focus trapping in chat panel
- **Reduced Motion**: Respects user motion preferences

#### Security
- **No External Calls**: Fully client-side operation
- **Data Privacy**: All data stored locally with user control
- **Input Sanitization**: Basic text processing only
- **No Sensitive Data**: No tokens or credentials in chat system

### 🎨 Design System

#### Brand Integration
- **ThesisFlow Orange**: Primary color (#FF6B2C) throughout
- **Consistent Typography**: IBM Plex Sans font family
- **Shadcn/ui Components**: Leverages existing design system
- **Responsive Design**: Mobile-first approach with breakpoints

#### Visual Elements
- **Floating Action Button**: Bottom-right positioning
- **Unread Indicator**: Red dot for new broadcasts
- **Message Bubbles**: User (orange) vs Assistant (gray) styling
- **Quick Reply Chips**: Outlined badges with hover effects
- **Broadcast Banner**: Dismissible blue-tinted notification

### 📱 Mobile Experience

#### Responsive Behavior
- **Desktop**: 360-420px panel with shadow overlay
- **Mobile**: Full-height bottom sheet with backdrop
- **Touch Optimized**: Proper touch targets and gestures
- **Keyboard Friendly**: Virtual keyboard handling

### 🔮 Future Enhancements

#### Phase 2 Roadmap
- **RAG Integration**: Document search with embeddings
- **Form Support**: Contact forms and bug reporting
- **Multi-language**: i18n support for global users
- **Advanced Analytics**: Conversation flow analysis
- **Human Handoff**: Escalation to support team

#### Scalability Considerations
- **Server-side Engine**: Move processing to API routes
- **Database Storage**: Persistent conversation history
- **Admin Interface**: Content management system
- **A/B Testing**: Response optimization tools

### 📈 Impact Metrics

#### Expected Improvements
- **Reduced Support Tickets**: Self-service for common questions
- **Improved Onboarding**: Contextual help for new users
- **Higher Engagement**: Easy access to platform information
- **Better User Satisfaction**: Instant responses to queries

#### Success Metrics
- Chat open rate from home page visitors
- Intent classification accuracy
- User feedback ratings (thumbs up/down)
- Deep-link conversion from changelog
- Support ticket reduction for covered topics

---

## Implementation Notes

### Mounting Strategy
The support widget is exclusively mounted on the home page (`app/page.tsx`) and never appears on other routes. This ensures focused user experience and prevents distraction on task-focused pages.

### Knowledge Base Maintenance
The system uses a modular knowledge base that can be easily expanded:
1. Add new intents to `intents.json`
2. Create response templates in `responses/`
3. Test keyword matching
4. Deploy updates

### Performance Impact
- **LCP Impact**: Zero (lazy loaded)
- **Runtime Performance**: Instant responses (no API calls)
- **Memory Usage**: Minimal (localStorage only)

This implementation provides a solid foundation for user support while maintaining the high performance and user experience standards of ThesisFlow-AI.

---

## v2.2.1 - Analytics v2 Improvements (2025-09-24)

### Summary
- Eliminated ambiguous “Other” buckets by introducing a canonical feature taxonomy and consistent mapping.
- Ensured zero-cost usage (e.g., Explorer Assistant bypass) is recorded for visibility without affecting billing.
- Added dimensions for API key ownership and provider to improve attribution and auditing.

### Backend
- Added `public.usage_events` table to record usage-only events (including `tokens_charged = 0`).
- Extended analytics API `/api/usage/analytics/v2` to:
  - Canonicalize feature names and return `unknown` for unmapped cases.
  - Merge additive metrics from `usage_events` with the materialized view `usage_daily_mv`.
  - Support dimensions: `service`, `feature`, `provider`, `model`, `api_key_owner`, `api_key_provider`.

### Middleware
- Token middleware logs zero-cost usage events after successful handler execution when no deduction occurs and for Explorer Assistant bypass.

### UI
- Usage Analytics UI now supports new dimensions and continues to normalize OpenRouter-based providers as `NOVA` with model family grouping (GPT, Claude, Llama, Gemini, Mixtral, Qwen, DeepSeek, GLM, Nemotron, Gemma, Mistral, Other).

### Docs
- Updated `docs/database-schema.md`, `docs/design-architecture.md`, `docs/tokens.md`, `docs/pages/explorer/README.md`.
- Added `docs/pages/analytics/README.md` and listed it in `docs/pages/README.md`.
