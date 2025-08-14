---
inclusion: always
---

# Branding & Design Guidelines

## Brand Identity

### Brand Name & Logo

- **Primary Brand**: "Bolt Research Hub"
- **Logo**: Black square with "Bolt" in white text, paired with "Research Hub" wordmark
- **Tagline**: "AI-Powered Research Platform" or "for research purposes"
- **Brand Voice**: Professional, innovative, research-focused, accessible

### Brand Colors

- **Primary**: Black (`hsl(0 0% 9%)`) - Used for logo, primary buttons, and key elements
- **Background**: Light gray (`hsl(0 0% 96.1%)`) - Main background color
- **Accent**: Blue gradient (`from-blue-500 to-purple-600`) - Used for avatars and highlights
- **Destructive**: Red (`hsl(0 84.2% 60.2%)`) - Error states and warnings

## Design System

### Typography

- **Font Family**: Inter (primary), with system font fallbacks
- **Font Weights**:
  - Extra Light (200) - Display headings
  - Light (300) - Body text default
  - Normal (400) - Standard text
  - Medium (500) - Emphasis
  - Semibold (600) - Subheadings
  - Bold (700) - Strong emphasis

### Typography Scale

- **Display**: `text-4xl sm:text-5xl lg:text-6xl font-extralight` - Hero headings
- **Headline**: `text-2xl sm:text-3xl lg:text-4xl font-light` - Section headings
- **Title**: `text-xl sm:text-2xl font-normal` - Card titles, page titles
- **Body**: `text-base leading-relaxed` - Standard content
- **Caption**: `text-sm text-muted-foreground` - Secondary information

### Color System (CSS Variables)

```css
/* Light Mode */
--background: 0 0% 100%;
--foreground: 0 0% 3.9%;
--primary: 0 0% 9%;
--secondary: 0 0% 96.1%;
--muted: 0 0% 96.1%;
--accent: 0 0% 96.1%;
--border: 0 0% 89.8%;

/* Dark Mode */
--background: 0 0% 3.9%;
--foreground: 0 0% 98%;
--primary: 0 0% 98%;
--secondary: 0 0% 14.9%;
--muted: 0 0% 14.9%;
--accent: 0 0% 14.9%;
--border: 0 0% 14.9%;
```

### Spacing & Layout

- **Container**: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- **Section Spacing**: `py-16 lg:py-24`
- **Content Spacing**: `space-y-8 lg:space-y-12`
- **Border Radius**: `--radius: 0.375rem` (6px)

### Component Patterns

#### Buttons

- **Primary**: Black background, white text
- **Secondary**: Light gray background, dark text
- **Ghost**: Transparent with hover states
- **Outline**: Border with transparent background
- **Sizes**: sm (h-9), default (h-10), lg (h-11), icon (h-10 w-10)

#### Cards

- **Base**: White background with subtle shadow
- **Hover**: Elevated shadow with smooth transition
- **Border**: Subtle border using `--border` color
- **Padding**: Consistent header/content spacing

#### Navigation

- **Header**: Sticky, backdrop blur, white/95 opacity
- **Logo**: Black square + wordmark combination
- **Active States**: Gray background for current page
- **User Avatar**: Gradient background with initials fallback

## UI Component Guidelines

### Icons

- **Library**: Lucide React
- **Size**: Consistent 4x4 (h-4 w-4) for most contexts
- **Style**: Outline style, consistent stroke width
- **Color**: Inherit from parent or use semantic colors

### Forms

- **Validation**: Zod schemas with clear error messages
- **Focus States**: Ring outline with offset
- **Input Styling**: Consistent with design system
- **Labels**: Clear, descriptive, properly associated

### Animations

- **Fade In**: `fade-in 0.5s ease-out` for content loading
- **Hover Transitions**: `transition-colors` for interactive elements
- **Shimmer**: Loading states with subtle animation
- **Stagger**: Delayed animations for lists (100ms increments)

## Content Guidelines

### Messaging Tone

- **Professional**: Maintain academic credibility
- **Accessible**: Clear, jargon-free explanations
- **Innovative**: Emphasize AI-powered capabilities
- **Collaborative**: Highlight team features
- **Trustworthy**: Emphasize security and reliability

### Feature Descriptions

- **Research Explorer**: "Discover and analyze research papers with AI-powered insights"
- **Smart Summarizer**: "Generate comprehensive summaries from papers and documents"
- **Project Planner**: "Organize research projects with intelligent task management"
- **Collaboration Hub**: "Work together with real-time chat and shared workspaces"
- **AI Assistant**: "Get expert guidance on methodology and research practices"

### Call-to-Action Language

- Primary: "Start Exploring", "Get Started Free", "Create Account"
- Secondary: "Learn More", "View Demo", "Try Now"
- Avoid: Generic terms like "Click Here" or "Submit"

## Responsive Design

### Breakpoints

- **Mobile**: Default styles (< 640px)
- **Tablet**: `sm:` (≥ 640px)
- **Desktop**: `lg:` (≥ 1024px)
- **Large**: `xl:` (≥ 1280px)

### Mobile-First Approach

- Start with mobile layouts
- Progressive enhancement for larger screens
- Touch-friendly interactive elements (min 44px)
- Readable text sizes on all devices

## Accessibility Standards

### Color Contrast

- Maintain WCAG AA compliance (4.5:1 ratio)
- Test with color blindness simulators
- Provide alternative indicators beyond color

### Interactive Elements

- Focus indicators for keyboard navigation
- Proper ARIA labels and roles
- Semantic HTML structure
- Screen reader friendly content

### Typography

- Sufficient line height for readability
- Scalable text that works with browser zoom
- Clear hierarchy with proper heading structure

## Implementation Rules

### CSS Classes

- Use Tailwind utility classes consistently
- Custom CSS only for complex animations or unique patterns
- Maintain design token consistency via CSS variables
- Use `cn()` utility for conditional class merging

### Component Structure

- Follow shadcn/ui patterns for base components
- Consistent prop interfaces across similar components
- Proper TypeScript typing for all props
- Error boundaries for robust user experience

### Performance

- Lazy load non-critical components
- Optimize images and assets
- Use proper caching strategies
- Minimize layout shifts during loading
