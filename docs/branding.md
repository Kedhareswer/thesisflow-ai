# Branding

ThesisFlow-AI projects a precise, research-grade brand with calm, trustworthy UX. Our design philosophy prioritizes clarity, functionality, and professional credibility over flashy aesthetics.

## Brand Identity
- **Product Name**: ThesisFlow-AI (always hyphenated, never "Thesis Flow" or "ThesisFlow AI")
- **Tagline**: "AI Research Sidekick Built for Big Dreamers, Smarter, Faster, Stress-Free"
- **Positioning**: Professional research copilot for students, researchers, and academic teams
- **Personality**: Intelligent, reliable, empowering, research-focused

## Voice and Tone
- **Clear, direct, and confident**: No ambiguity in instructions or feature descriptions
- **Research-first empathy**: Understand academic workflows and pain points
- **Professional but approachable**: Academic credibility without stuffiness
- **Precise terminology**: Use proper academic and technical language
- **Avoid marketing fluff**: Focus on functional benefits over hyperbolic claims

## Writing Style
- **Active voice preferred**: "Extract insights from PDFs" vs "Insights can be extracted"
- **Short, scannable sentences**: Break complex ideas into digestible chunks
- **Bullet points and lists**: Make information easy to scan and reference
- **Code references**: Use backticks for paths (`app/api/ai/chat/stream/route.ts`)
- **Technical precision**: Make SSE events explicit (`init`, `progress`, `token`, `error`, `done`, `ping`)
- **Helpful error messages**: Specific, actionable guidance for problem resolution

## Visual Identity

### Color Palette
- **Primary Brand Color**: `#FF6B2C` (ThesisFlow Orange)
  - Used for: Primary CTAs, active states, brand moments, key highlights
  - Never overused: Reserve for most important actions only
- **Neutral Foundation**: 
  - Light backgrounds: `#FFFFFF`, `#F7F6F3` (warm off-white)
  - Dark backgrounds: `#000000`, `#neutral-950`
  - Text: High contrast ratios for accessibility
- **Semantic Colors**: Standard Tailwind success/warning/error states

### Typography
- **Primary Font**: IBM Plex Sans - Professional, readable, research-appropriate
- **Monospace**: IBM Plex Mono for code and technical elements
- **Hierarchy**: Clear size and weight distinctions
- **Responsive**: Fluid typography using `clamp()` functions

### Motion and Animation
- **Subtle and purposeful**: Every animation serves a functional purpose
- **Longer durations**: 600-1200ms for relaxed, professional feel
- **Natural easing**: `ease-in-out` and custom cubic-bezier curves
- **Respect accessibility**: Honor `prefers-reduced-motion` settings
- **Avoid distracting animations**: Especially in content-heavy research views

## UI Guidelines

### Layout and Structure
- **Consistent navigation**: Maintain predictable navigation patterns across all pages
- **Discoverable controls**: All interactive elements should be clearly labeled and accessible
- **Responsive design**: Mobile-first approach with progressive enhancement
- **Content hierarchy**: Clear information architecture that follows research workflows

### Interactive Elements
- **Button states**: Clear hover, active, focus, and disabled states
- **Form design**: Immediate validation with helpful error messages
- **Loading states**: Skeleton screens and progress indicators for long operations
- **Empty states**: Helpful guidance when no content is available

### Accessibility Standards
- **WCAG AA compliance**: Minimum standard for all components
- **Color contrast**: 4.5:1 ratio for normal text, 3:1 for large text
- **Keyboard navigation**: Full keyboard accessibility for all features
- **Screen reader support**: Proper ARIA labels and semantic HTML
- **Font scaling**: Support user font size preferences up to 200%

### Links and Navigation
- **External links**: Always open in new tab with `rel="noopener noreferrer"`
- **Source citations**: Consistent formatting and reliable link handling
- **Breadcrumbs**: Clear path indication for deep navigation

## Component Design System

### Cards and Containers
- **Glass morphism**: Subtle backdrop blur effects for overlays
- **Consistent borders**: Rounded corners (8px, 12px, 16px) throughout
- **Layered shadows**: Subtle depth without harsh contrasts
- **Responsive spacing**: Consistent padding and margins across breakpoints

### Data Visualization
- **Functional charts**: Clarity and accuracy over visual flair
- **Accessible colors**: Color schemes that work for colorblind users
- **Interactive elements**: Meaningful hover states and tooltips
- **Consistent scales**: Standardized axes across related visualizations

## Homepage Design Elements

### Hero Section
- **Background imagery**: High-quality research-themed visuals
- **Glass navigation**: Subtle backdrop blur for top navigation
- **Clear CTAs**: Primary actions prominently displayed
- **Responsive typography**: Fluid scaling across all devices

### Feature Showcases
- **Stacking cards**: Animated scroll-based reveals of key features
- **Stats carousel**: Animated counters highlighting key metrics
- **Benefits section**: Clear value propositions with supporting icons
- **Target audience cards**: Specific messaging for different user types

### Interactive Components
- **Research stacking cards**: Showcase actual product screenshots
- **Stats carousel**: ThesisFlow-AI specific metrics and achievements
- **Animated elements**: Subtle motion that enhances rather than distracts

## Content Guidelines

### Feature Descriptions
- **Multi-Source Research Discovery**: Emphasize breadth and quality of sources
- **One-Click Summaries & Tables**: Highlight extraction capabilities
- **Plans that Stay in Sync**: Focus on dynamic project management
- **Seamless Collaboration**: Stress team workflow benefits

### Messaging Hierarchy
1. **Primary value**: AI-powered research acceleration
2. **Key benefits**: Time savings, accuracy, collaboration
3. **Target audiences**: Students, researchers, academic teams
4. **Technical capabilities**: Multi-format support, real-time processing

## Brand Implementation

### Code Organization
- **Global styles**: `styles/globals.css` for foundational design tokens
- **Component library**: `components/ui/` for reusable design patterns
- **AI elements**: `src/components/ai-elements/` for specialized research UI
- **Page compositions**: `app/**/page.tsx` for page-specific layouts

### Design Tokens
- **Colors**: Centralized color palette in CSS custom properties
- **Typography**: Font family and size scales
- **Spacing**: Consistent spacing scale based on 8px grid
- **Animations**: Standardized duration and easing values

## Quality Standards

### Performance
- **Loading optimization**: Prioritize critical path rendering
- **Image optimization**: WebP format with proper sizing
- **Animation performance**: 60fps target for all motion
- **Code splitting**: Lazy load non-critical components

### Consistency Checks
- **Regular audits**: Quarterly design system reviews
- **Component updates**: Systematic maintenance of design patterns
- **Cross-browser testing**: Consistent experience across modern browsers
- **Accessibility testing**: Regular validation with assistive technologies

## Don'ts - Critical Restrictions

### Motion and Animation
- **No sudden movements**: Avoid jarring or attention-grabbing animations
- **No unnecessary motion**: Every animation must serve a functional purpose
- **No performance-heavy effects**: Avoid animations that cause frame drops

### Technical Constraints
- **Never rename SSE events**: Breaking `init`, `progress`, `token`, `error`, `done`, `ping` breaks the UI contract
- **No internal IDs in UI**: Keep database IDs and technical details hidden from users
- **No legacy branding**: Always use "ThesisFlow-AI", never old product names

### Content and Messaging
- **No marketing hyperbole**: Focus on functional benefits over exaggerated claims
- **No technical jargon**: Use clear, accessible language for all user-facing content
- **No inconsistent terminology**: Maintain precise, standardized language across all features
