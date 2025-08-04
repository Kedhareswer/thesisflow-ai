# Command Menu Components

This directory contains command menu components designed to provide quick access to application functions through a searchable interface.

## Components Overview

### 1. `command-menu.tsx` - Core Command Menu
The base command menu component with keyboard navigation and search functionality.

**Features:**
- Global keyboard shortcut (Ctrl+K / ⌘+K)
- Fuzzy search with instant results
- Keyboard navigation (arrow keys, Enter, Escape)
- Mouse hover support
- Command grouping and organization
- Shortcut key display
- Icon support for visual recognition
- Responsive design with animations
- Dark mode support
- Accessibility features (ARIA labels)

**Props:**
```typescript
interface CommandMenuProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

interface CommandMenuContentProps {
  showShortcut?: boolean;
  scrollType?: "auto" | "always" | "scroll" | "hover";
  scrollHideDelay?: number;
  className?: string;
}

interface CommandMenuItemProps {
  onSelect?: () => void;
  disabled?: boolean;
  shortcut?: string;
  icon?: React.ReactNode;
  index?: number;
  children?: React.ReactNode;
}
```

**Usage:**
```tsx
import {
  CommandMenu,
  CommandMenuTrigger,
  CommandMenuContent,
  CommandMenuInput,
  CommandMenuList,
  CommandMenuGroup,
  CommandMenuItem,
  useCommandMenuShortcut,
} from "@/components/ui/command-menu";

function MyComponent() {
  const [open, setOpen] = React.useState(false);
  useCommandMenuShortcut(() => setOpen(true));

  return (
    <CommandMenu open={open} onOpenChange={setOpen}>
      <CommandMenuTrigger asChild>
        <Button>Open Command Menu</Button>
      </CommandMenuTrigger>
      <CommandMenuContent>
        <CommandMenuInput placeholder="Search commands..." />
        <CommandMenuList>
          <CommandMenuGroup heading="Actions">
            <CommandMenuItem 
              icon={<Plus />} 
              index={0} 
              shortcut="cmd+n"
              onSelect={() => console.log("New document")}
            >
              New Document
            </CommandMenuItem>
          </CommandMenuGroup>
        </CommandMenuList>
      </CommandMenuContent>
    </CommandMenu>
  );
}
```

### 2. `kbd.tsx` - Keyboard Shortcut Display
Component for displaying keyboard shortcuts in a consistent style.

**Features:**
- Multiple size variants (xs, sm, md, lg)
- Multiple style variants (default, outline, solid, secondary)
- Support for multiple keys with + separator
- Clickable with hover effects
- Responsive design

**Usage:**
```tsx
import { Kbd } from "@/components/ui/kbd";

// Single key
<Kbd size="sm">Ctrl</Kbd>

// Multiple keys
<Kbd keys={["Ctrl", "K"]} size="sm" />

// With custom styling
<Kbd variant="outline" size="lg">⌘</Kbd>
```

### 3. `writer-command-menu.tsx` - Writer-Specific Command Menu
Specialized command menu for the Writer page with writing-specific commands.

**Features:**
- 50+ writing-specific commands
- Organized into logical groups:
  - Document operations
  - AI Tools
  - Formatting
  - Alignment
  - Edit operations
  - Analysis tools
  - Output options
  - Help & Settings
- Context-aware command handling
- Toast notifications for user feedback

**Command Categories:**

#### Document Operations
- New Document
- Save Document
- Export Document
- Import Document
- Share Document

#### AI Tools
- AI Writing Assistant
- Citation Manager
- AI Content Detection
- Humanize Text
- Plagiarism Check
- Visual Content

#### Formatting
- Bold, Italic, List, Quote
- Link, Image, Table, Code
- Heading 1, 2, 3

#### Alignment
- Left, Center, Right

#### Edit Operations
- Undo, Redo
- Find & Replace

#### Analysis Tools
- Word Count
- Spell Check
- Grammar Check
- Readability Score
- Tone Analysis
- Sentiment Analysis
- Keyword Density

#### Output Options
- Read Aloud
- Print
- Print Preview
- Page Setup

#### Help & Settings
- Preferences
- Help, About
- Feedback, Bug Report
- Feature Request
- Contact Support
- Documentation
- Tutorial
- Keyboard Shortcuts
- Accessibility

## Integration Examples

### 1. Writer Page Integration
```tsx
// In app/writer/page.tsx
import { WriterCommandMenu } from "./components/writer-command-menu";

// Add to the top bar
<div className="flex items-center gap-4">
  <WriterCommandMenu
    onNewDocument={handleNewDocument}
    onSaveDocument={handleSaveDocument}
    onExportDocument={handleExportDocument}
    // ... other handlers
  />
</div>
```

### 2. Custom Command Menu
```tsx
import {
  CommandMenu,
  CommandMenuTrigger,
  CommandMenuContent,
  CommandMenuInput,
  CommandMenuList,
  CommandMenuGroup,
  CommandMenuItem,
  useCommandMenuShortcut,
} from "@/components/ui/command-menu";

function CustomCommandMenu() {
  const [open, setOpen] = React.useState(false);
  useCommandMenuShortcut(() => setOpen(true));

  return (
    <CommandMenu open={open} onOpenChange={setOpen}>
      <CommandMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Command size={16} />
          Quick Actions
        </Button>
      </CommandMenuTrigger>
      <CommandMenuContent>
        <CommandMenuInput placeholder="Search commands..." />
        <CommandMenuList>
          <CommandMenuGroup heading="Actions">
            <CommandMenuItem 
              icon={<Plus />} 
              index={0} 
              onSelect={() => console.log("Action 1")}
            >
              Action 1
            </CommandMenuItem>
            <CommandMenuItem 
              icon={<Settings />} 
              index={1} 
              shortcut="cmd+s"
              onSelect={() => console.log("Action 2")}
            >
              Action 2
            </CommandMenuItem>
          </CommandMenuGroup>
        </CommandMenuList>
      </CommandMenuContent>
    </CommandMenu>
  );
}
```

## Best Practices

### 1. Command Organization
- Group related commands together
- Use descriptive headings for groups
- Order commands by frequency of use
- Keep commands concise and clear

### 2. Keyboard Shortcuts
- Use standard shortcuts when possible (Ctrl+S for save)
- Display shortcuts in the command menu
- Ensure shortcuts don't conflict with browser defaults
- Provide visual feedback for shortcuts

### 3. User Experience
- Provide immediate feedback for actions
- Use toast notifications for non-destructive actions
- Show loading states for async operations
- Handle errors gracefully

### 4. Accessibility
- Include proper ARIA labels
- Support keyboard-only navigation
- Provide screen reader support
- Ensure sufficient color contrast

### 5. Performance
- Debounce search input
- Lazy load command results if needed
- Optimize command filtering
- Cache frequently used commands

## Dependencies

The command menu components require these dependencies (already installed):

```json
{
  "@radix-ui/react-dialog": "latest",
  "@radix-ui/react-visually-hidden": "latest",
  "@radix-ui/react-scroll-area": "latest",
  "framer-motion": "^12.23.12",
  "lucide-react": "^0.454.0",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.5.5"
}
```

## Testing

Visit `/test-command-menu` to see the command menu in action:

- Interactive command menu demo
- All 50+ writing commands
- Keyboard shortcut testing
- Search functionality
- Navigation examples
- Integration instructions

## Customization

### Styling
The command menu uses Tailwind CSS classes and can be customized:

```tsx
<CommandMenuContent className="my-custom-class">
  {/* Custom content */}
</CommandMenuContent>
```

### Animations
Animations are powered by Framer Motion and can be customized:

```tsx
// In command-menu.tsx
const motionVariants = {
  // Customize animation variants here
};
```

### Commands
Add custom commands by extending the command list:

```tsx
<CommandMenuGroup heading="Custom Commands">
  <CommandMenuItem 
    icon={<CustomIcon />} 
    index={50} 
    onSelect={handleCustomAction}
  >
    Custom Action
  </CommandMenuItem>
</CommandMenuGroup>
```

## Future Enhancements

1. **Command History** - Remember recently used commands
2. **Command Aliases** - Allow multiple names for the same command
3. **Context-Aware Commands** - Show different commands based on current state
4. **Command Macros** - Execute multiple commands in sequence
5. **Custom Command Registration** - Allow plugins to register commands
6. **Command Analytics** - Track command usage for optimization
7. **Voice Commands** - Speech-to-text command input
8. **Command Suggestions** - AI-powered command suggestions

## Troubleshooting

### Command Menu Not Opening
- Check if keyboard shortcut is working
- Verify event listeners are properly attached
- Check for JavaScript errors in console
- Ensure component is properly mounted

### Search Not Working
- Verify search input is properly connected
- Check command filtering logic
- Ensure command text is searchable
- Test with different search terms

### Keyboard Navigation Issues
- Check if arrow key events are being captured
- Verify command item indices are correct
- Ensure proper focus management
- Test with different keyboard layouts

### Styling Issues
- Verify Tailwind CSS is properly configured
- Check for CSS conflicts
- Ensure dark mode classes are applied
- Test responsive behavior

## Examples

### Basic Command Menu
```tsx
<CommandMenu open={open} onOpenChange={setOpen}>
  <CommandMenuTrigger asChild>
    <Button>Open Menu</Button>
  </CommandMenuTrigger>
  <CommandMenuContent>
    <CommandMenuInput placeholder="Search..." />
    <CommandMenuList>
      <CommandMenuItem onSelect={() => console.log("Action")}>
        Action
      </CommandMenuItem>
    </CommandMenuList>
  </CommandMenuContent>
</CommandMenu>
```

### Advanced Command Menu
```tsx
<WriterCommandMenu
  onNewDocument={handleNewDocument}
  onSaveDocument={handleSaveDocument}
  onExportDocument={handleExportDocument}
  onToggleAiAssistant={handleToggleAiAssistant}
  onFormatBold={handleFormatBold}
  onWordCount={handleWordCount}
  onPrint={handlePrint}
  onHelp={handleHelp}
  // ... other handlers
/>
```

## Contributing

When adding new commands:

1. Add the command to the appropriate group
2. Include a descriptive icon
3. Add keyboard shortcut if applicable
4. Implement the handler function
5. Add proper error handling
6. Test the command thoroughly
7. Update documentation

## License

This component is part of the AI Project Planner application and follows the same license terms. 