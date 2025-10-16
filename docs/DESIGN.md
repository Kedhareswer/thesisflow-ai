# ThesisFlow-AI Design System

This document consolidates all design, branding, and UI/UX principles for ThesisFlow-AI.

## Brand Identity

### Product Name
**ThesisFlow-AI** (always hyphenated, never "Thesis Flow" or "ThesisFlow AI")

### Tagline
"AI Research Sidekick Built for Big Dreamers, Smarter, Faster, Stress-Free"

### Positioning
Professional research copilot for students, researchers, and academic teams

### Personality
Intelligent, reliable, empowering, research-focused

---

## Core Design Philosophy

### Research-First Approach
- **Clarity over cleverness**: Every design decision should make research tasks clearer and more efficient
- **Content hierarchy**: Information architecture follows research workflows, not marketing funnels
- **Cognitive load reduction**: Minimize mental overhead so users can focus on their research
- **Professional credibility**: Visual design reinforces academic and professional trust

### Calm Technology
- **Subtle interactions**: Motion and transitions should feel natural, never attention-grabbing
- **Predictable patterns**: Consistent UI behaviors across all features and pages
- **Respectful of focus**: Avoid interrupting deep work with unnecessary notifications or animations
- **Accessible by default**: Design for all users, including those with disabilities

---

## Visual Identity

### Color Palette

**Primary Brand Color**: `#FF6B2C` (ThesisFlow Orange)
- Used for: Primary CTAs, active states, brand moments, key highlights
- Never overused: Reserve for most important actions only

**Neutral Foundation**:
- Light backgrounds: `#FFFFFF`, `#F7F6F3` (warm off-white)
- Dark backgrounds: `#000000`, `#neutral-950`
- Text: High contrast ratios (4.5:1 minimum, 7:1 preferred)

**Semantic Colors**: Standard success, warning, error states using Tailwind defaults

### Typography

**Primary Font**: IBM Plex Sans - Professional, readable, research-appropriate

**Font Hierarchy**:
- Headings: Bold weights (600-900) for section breaks
- Body: Regular (400) and medium (500) for content
- Code: IBM Plex Mono for technical elements

**Line Height**: Generous spacing (1.5-1.7) for comfortable reading

**Responsive Scaling**: `clamp()` functions for fluid typography across devices

### Layout & Spacing

- **Grid System**: 12-column responsive grid with consistent gutters
- **Spacing Scale**: Tailwind's default scale (4px base unit) for predictable rhythm
- **Content Width**: Max-width containers (1280px) prevent overly wide text blocks
- **Vertical Rhythm**: Consistent spacing between sections using multiples of 8px

### Component Design

- **Glass Morphism**: Subtle backdrop blur effects for overlays and cards
- **Rounded Corners**: Consistent border radius (8px, 12px, 16px) for modern feel
- **Shadows**: Layered depth with subtle shadows, never harsh or dramatic
- **Borders**: Minimal use, primarily for form inputs and card boundaries

---

## Interaction Design

### Animation Principles

**Duration**: Longer, more relaxed timing (600-1200ms) over snappy transitions

**Easing**: Natural curves (`ease-in-out`, `cubic-bezier`) that feel organic

**Purpose**: Every animation serves a functional purpose (feedback, guidance, context)

**Respect Preferences**: Honor `prefers-reduced-motion` for accessibility

### Micro-interactions

- **Button States**: Clear hover, active, and disabled states
- **Form Feedback**: Immediate validation with helpful error messages
- **Loading States**: Skeleton screens and progress indicators for long operations
- **Success Feedback**: Subtle confirmations that don't interrupt workflow

### Navigation Patterns

- **Breadcrumbs**: Clear path indication for deep navigation
- **Consistent Placement**: Navigation elements in expected locations
- **Keyboard Accessible**: Full keyboard navigation support
- **Focus Management**: Logical tab order and visible focus indicators

---

## Voice and Tone

### Writing Style

- **Clear, direct, and confident**: No ambiguity in instructions or feature descriptions
- **Research-first empathy**: Understand academic workflows and pain points
- **Professional but approachable**: Academic credibility without stuffiness
- **Precise terminology**: Use proper academic and technical language
- **Avoid marketing fluff**: Focus on functional benefits over hyperbolic claims

### Content Guidelines

- **Active voice preferred**: "Extract insights from PDFs" vs "Insights can be extracted"
- **Short, scannable sentences**: Break complex ideas into digestible chunks
- **Bullet points and lists**: Make information easy to scan and reference
- **Code references**: Use backticks for paths (`app/api/ai/chat/stream/route.ts`)
- **Technical precision**: Make SSE events explicit (`init`, `progress`, `token`, `error`, `done`, `ping`)
- **Helpful error messages**: Specific, actionable guidance for problem resolution

---

## Responsive Design

### Mobile-First Approach

- **Progressive Enhancement**: Start with mobile constraints, enhance for larger screens
- **Touch Targets**: Minimum 44px tap targets for mobile usability
- **Readable Text**: Never smaller than 16px on mobile devices
- **Simplified Navigation**: Collapsible menus and streamlined mobile flows

### Breakpoint Strategy

- **Mobile**: 320px - 767px (single column, stacked content)
- **Tablet**: 768px - 1023px (mixed layouts, some side-by-side content)
- **Desktop**: 1024px+ (full multi-column layouts, hover interactions)
- **Large Screens**: 1440px+ (wider containers, more white space)

---

## Accessibility Standards

### WCAG Compliance

- **Level AA**: Minimum standard for all components and pages
- **Color Contrast**: 4.5:1 for normal text, 3:1 for large text
- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **Screen Readers**: Proper ARIA labels and semantic HTML structure

### Inclusive Design

- **Font Scaling**: Respect user font size preferences up to 200%
- **Motion Sensitivity**: Reduced motion options for vestibular disorders
- **Color Independence**: Never rely solely on color to convey information
- **Clear Language**: Plain language principles for all user-facing text

---

## Component Library

### Reusable Patterns

**Location**: `components/ui/` for reusable design patterns

**Design Tokens**: Centralized color, spacing, and typography values

**Documentation**: Clear usage guidelines for each component

**Version Control**: Systematic updates to maintain consistency

---

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

---

## Performance Considerations

### Loading Strategies

- **Critical Path**: Prioritize above-the-fold content and core functionality
- **Progressive Loading**: Skeleton screens while content loads
- **Image Optimization**: WebP format with fallbacks, proper sizing
- **Code Splitting**: Lazy load non-critical components and routes

### Animation Performance

- **GPU Acceleration**: Use `transform` and `opacity` for smooth animations
- **Reduced Complexity**: Avoid animating layout properties
- **Frame Rate**: Target 60fps for all animations
- **Fallback States**: Graceful degradation when animations can't run smoothly

---

## Quality Assurance

### Design Reviews

- **Accessibility Audit**: Every new component tested with screen readers
- **Cross-browser Testing**: Consistent experience across modern browsers
- **Device Testing**: Real device testing for mobile and tablet experiences
- **Performance Monitoring**: Regular checks for loading times and animation smoothness

### User Testing

- **Research Context**: Test with actual researchers and students
- **Task-based Testing**: Focus on real research workflows
- **Accessibility Testing**: Include users with disabilities in testing
- **Iterative Improvement**: Regular design updates based on user feedback

---

## Critical Restrictions

### What NOT to Do

**Motion and Animation**:
- ❌ No sudden movements: Avoid jarring or attention-grabbing animations
- ❌ No unnecessary motion: Every animation must serve a functional purpose
- ❌ No performance-heavy effects: Avoid animations that cause frame drops

**Technical Constraints**:
- ❌ Never rename SSE events: Breaking `init`, `progress`, `token`, `error`, `done`, `ping` breaks the UI contract
- ❌ No internal IDs in UI: Keep database IDs and technical details hidden from users
- ❌ No legacy branding: Always use "ThesisFlow-AI", never old product names

**Content and Messaging**:
- ❌ No marketing hyperbole: Focus on functional benefits over exaggerated claims
- ❌ No technical jargon: Use clear, accessible language for all user-facing content
- ❌ No inconsistent terminology: Maintain precise, standardized language across all features

---

## Implementation Guidelines

### Development Handoff

- **Design Tokens**: Use CSS custom properties for consistent values
- **Component Specs**: Detailed specifications for all interactive states
- **Animation Timing**: Exact duration and easing values specified
- **Responsive Behavior**: Clear breakpoint and layout specifications

### Code Organization

- **Global styles**: `styles/globals.css` for foundational design tokens
- **Component library**: `components/ui/` for reusable design patterns
- **AI elements**: `src/components/ai-elements/` for specialized research UI
- **Page compositions**: `app/**/page.tsx` for page-specific layouts

---

## Maintenance

- **Regular Audits**: Quarterly reviews of design consistency
- **Component Updates**: Systematic updates to maintain design system integrity
- **Documentation**: Keep design principles and component docs current
- **Training**: Ensure all team members understand and apply these principles

---

**Last Updated**: 2025-10-17
**Next Review**: 2026-01-17
