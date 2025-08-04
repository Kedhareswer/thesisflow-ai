# Upgrade Banner Components

This directory contains upgrade banner components designed to encourage free tier users to upgrade to premium plans.

## Components Overview

### 1. `upgrade-banner.tsx` - Basic Upgrade Banner
The core upgrade banner component with animated icons and hover effects.

**Features:**
- Animated settings icons on hover
- Smooth entrance animations
- Dark mode support
- Customizable text and actions
- Dismissible with close button

**Props:**
```typescript
interface UpgradeBannerProps {
  buttonText?: string;        // Default: "Upgrade to Pro"
  description?: string;        // Default: "for 2x more CPUs and faster builds"
  onClose?: () => void;       // Called when banner is dismissed
  onClick?: () => void;       // Called when upgrade button is clicked
  className?: string;         // Additional CSS classes
}
```

**Usage:**
```tsx
import { UpgradeBanner } from "@/components/ui/upgrade-banner";

<UpgradeBanner
  buttonText="Upgrade to Pro"
  description="for unlimited projects and advanced features"
  onClose={() => setShowBanner(false)}
  onClick={() => window.location.href = '/pricing'}
/>
```

### 2. `smart-upgrade-banner.tsx` - Smart Upgrade Banner
Intelligent upgrade banner that automatically shows based on user plan and usage.

**Features:**
- Automatically checks user plan from Supabase
- Shows based on usage limits (80% threshold)
- Context-aware messaging
- Multiple pre-built banners for different features

**Components:**
- `SmartUpgradeBanner` - Generic smart banner
- `ProjectLimitBanner` - For project limits
- `TaskLimitBanner` - For task limits  
- `TeamLimitBanner` - For team member limits
- `StorageLimitBanner` - For storage limits

**Props:**
```typescript
interface SmartUpgradeBannerProps {
  feature?: string;           // Feature name (e.g., "projects")
  limit?: number;             // Usage limit
  currentUsage?: number;      // Current usage
  className?: string;         // Additional CSS classes
  showForFreeUsers?: boolean; // Whether to show for free users
  customMessage?: string;     // Custom upgrade message
  onUpgradeClick?: () => void; // Custom upgrade action
  onClose?: () => void;      // Custom close action
}
```

**Usage:**
```tsx
import { ProjectLimitBanner } from "@/components/ui/smart-upgrade-banner";

<ProjectLimitBanner currentUsage={2} />
```

### 3. `upgrade-banner-demo.tsx` - Demo Component
Interactive demo component showing how to use the upgrade banner.

**Features:**
- Show/hide functionality
- Toast notifications
- Example upgrade flow

## Integration Examples

### 1. Planner Page Integration
```tsx
// In app/planner/page.tsx
import { ProjectLimitBanner } from "@/components/ui/smart-upgrade-banner";

// Add to the top of the page
<div className="mb-6">
  <ProjectLimitBanner currentUsage={projects.length} />
</div>
```

### 2. Collaborate Page Integration
```tsx
// In app/collaborate/page.tsx
import { TeamLimitBanner } from "@/components/ui/smart-upgrade-banner";

// Add to the top of the page
<div className="mb-6">
  <TeamLimitBanner currentUsage={teams.length} />
</div>
```

### 3. Custom Usage-Based Banner
```tsx
import { SmartUpgradeBanner } from "@/components/ui/smart-upgrade-banner";

<SmartUpgradeBanner
  feature="AI generations"
  limit={10}
  currentUsage={8}
  customMessage="Upgrade for unlimited AI-powered research assistance"
  onUpgradeClick={() => {
    // Custom upgrade logic
    window.location.href = '/settings?tab=pricing';
  }}
/>
```

## Best Practices

### 1. When to Show Upgrade Banners
- **Free users reaching feature limits** - Show when they hit 80% of their limit
- **Access to premium features** - Show when they try to access pro features
- **Periodic reminders** - Show occasionally for free users (not too frequently)
- **After completing actions** - Show after they've used the free tier effectively

### 2. Banner Placement
- **Top of pages** - Most visible placement for important features
- **Near action buttons** - When users try to perform premium actions
- **In modals/dialogs** - When explaining feature limitations
- **In empty states** - When users have no content to see

### 3. Messaging Strategy
- **Be specific** - Mention the exact feature they're limited on
- **Show value** - Explain what they get with the upgrade
- **Use action words** - "Upgrade now", "Get unlimited", etc.
- **Keep it concise** - Short, compelling messages work best

### 4. User Experience
- **Allow dismissal** - Users should be able to close banners
- **Don't be annoying** - Don't show too frequently
- **Provide context** - Explain why the banner is showing
- **Easy upgrade path** - Make upgrading simple and clear

## Dependencies

The upgrade banner components require these dependencies (already installed):

```json
{
  "framer-motion": "^12.23.12",
  "lucide-react": "^0.454.0",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.5.5"
}
```

## Database Integration

The smart upgrade banners integrate with your Supabase database:

### Required Tables
- `user_plans` - Stores user plan information
- `user_usage` - Tracks feature usage (optional)

### Database Schema
```sql
-- user_plans table
CREATE TABLE user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  plan_type TEXT DEFAULT 'free',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_usage table (optional)
CREATE TABLE user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  feature_name TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Testing

Visit `/test-upgrade-banner` to see all upgrade banner components in action:

- Basic upgrade banner
- Demo component with interactions
- Smart banners for different features
- Custom smart banner examples
- Usage examples and best practices

## Customization

### Styling
The banners use Tailwind CSS classes and can be customized:

```tsx
<UpgradeBanner className="my-custom-class" />
```

### Animations
Animations are powered by Framer Motion and can be customized in the component:

```tsx
// In upgrade-banner.tsx
const iconVariants = {
  // Customize animation variants here
};
```

### Messages
Customize messages based on your app's needs:

```tsx
<SmartUpgradeBanner
  customMessage="Upgrade for unlimited AI research assistance"
  buttonText="Get Pro Access"
/>
```

## Future Enhancements

1. **A/B Testing** - Different banner designs and messages
2. **Analytics Integration** - Track banner effectiveness
3. **Personalized Messaging** - Based on user behavior
4. **Progressive Disclosure** - Show more details on interaction
5. **In-App Upgrade Flow** - Seamless upgrade experience

## Troubleshooting

### Banner Not Showing
- Check if user is authenticated
- Verify user plan exists in database
- Check usage limits and thresholds
- Ensure component is properly imported

### Styling Issues
- Verify Tailwind CSS is properly configured
- Check for CSS conflicts
- Ensure dark mode classes are applied

### Animation Issues
- Verify Framer Motion is installed
- Check for JavaScript errors in console
- Ensure proper React version compatibility 