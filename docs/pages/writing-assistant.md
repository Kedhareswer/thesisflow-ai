# Enhanced Scientific Paper Editor

## Overview

The Writing Assistant has been completely redesigned into a professional scientific paper editor with advanced collaborative features, minimalist UI, and academic-focused tools.

**Location**: `app/writing-assistant/page.tsx`

## Key Features

### 1. **Minimalist Interface**
- **Collapsible Panels**: Left (References) and Right (Activity) panels can be hidden
- **Clean Editor**: Distraction-free central editing area
- **Smooth Transitions**: 300ms animated panel transitions
- **Full-screen Mode**: Hide both panels for maximum focus

### 2. **Hover-Activated Floating Toolbar**
Appears only when hovering over the editor area:
- Bold, Italic, Strikethrough
- Bullet Lists, Numbered Lists
- Undo/Redo
- Auto-hides when mouse leaves editor

### 3. **Command Palette (⌘K / Ctrl+K)**
Keyboard-first workflow with instant access to:
- **Actions**: Save, Share, Export as PDF
- **Formatting**: Bold, Italic, Headings
- **Insert**: Citations, Tables
- **View**: Toggle panels

### 4. **Right-Click Context Menus**
Context-specific options:
- Formatting (Bold, Italic)
- Add Comment
- Suggest Edit
- Insert Citation
- Copy/Paste

### 5. **Collaborative Features**

#### Real-time Presence
- Collaborator avatars with online/away/offline status
- "Currently typing..." indicators
- Hover to see user details

#### Comments System
- Add comments via right-click or context menu
- Resolve/unresolve comments
- User attribution and timestamps
- Thread replies (coming soon)

#### Suggestions System
- Collaborators suggest edits with reasoning
- Side-by-side comparison (red for deletions, green for additions)
- Accept/Reject with one click
- Status tracking (pending/accepted/rejected)
- AI-powered suggestions

### 6. **Version History Timeline**
- Visual timeline with avatars
- See who made each change and when
- Restore previous versions
- Side-by-side comparison
- Change descriptions

### 7. **Reference Management**

#### Features:
- Dedicated left sidebar
- Search references in real-time
- Add new references with collapsible form
- Support for: Articles, Books, Websites, Other
- Fields: Authors, Title, Year, Journal, DOI, URL

#### Citation Workflow:
1. Add reference in left panel
2. Hover over reference card
3. Click "+" button to insert citation
4. Citation appears in text as `[citationKey]`
5. Bibliography auto-generated (coming soon)

### 8. **Enhanced Header**
- **Editable Title**: Click to rename document
- **Collaborator Avatars**: See who's online
- **Command Palette Button**: Quick access to ⌘K
- **Share Button**: Invite collaborators
- **More Options**: Save, Export, Import, Settings
- **Panel Toggles**: Show/hide left and right panels

### 9. **Smart Footer**
- Live word count
- Character count
- Auto-save indicator with pulse animation
- AI Assist button for quick improvements

## Technical Implementation

### Component Structure

```typescript
EnhancedScientificEditor/
├── EditorHeader          - Title, collaborators, actions
├── LeftSidebar           - References management
├── EditorArea           - Main editing with context menu
├── RightSidebar         - Comments/Suggestions/History tabs
├── FloatingToolbar      - Hover-activated formatting
├── CommandPalette       - Keyboard shortcuts
└── ShareModal           - Invite collaborators
```

### State Management

```typescript
// UI State
const [leftPanelOpen, setLeftPanelOpen] = useState(true);
const [rightPanelOpen, setRightPanelOpen] = useState(true);
const [commandOpen, setCommandOpen] = useState(false);
const [showToolbar, setShowToolbar] = useState(false);

// Feature State
const [comments, setComments] = useState<Comment[]>([]);
const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
const [versions, setVersions] = useState<Version[]>([]);
const [references, setReferences] = useState<Reference[]>([]);
const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
```

### Key Interfaces

```typescript
interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: Date;
  resolved: boolean;
  position: number;
}

interface Suggestion {
  id: string;
  userId: string;
  userName: string;
  type: "insert" | "delete" | "replace";
  original: string;
  suggested: string;
  reason: string;
  status: "pending" | "accepted" | "rejected";
  timestamp: Date;
}

interface Reference {
  id: string;
  type: "article" | "book" | "website" | "other";
  authors: string[];
  title: string;
  year: number;
  journal?: string;
  doi?: string;
  url?: string;
  citationKey?: string;
}
```

## Integration Points

### Existing Services
- **Tiptap Editor**: Collaborative real-time editing
- **Y.js**: CRDT for conflict-free synchronization
- **WebSocket**: Real-time presence and updates
- **enhancedAIService**: AI-powered suggestions
- **ShareModal**: Invitation system
- **useSocket**: WebSocket connection hook

### API Endpoints
The editor integrates with existing APIs:
- `/api/documents` - Save/load documents
- `/api/collaborate` - Manage collaborators
- `/api/presence/update` - Update user presence
- WebSocket events for real-time sync

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘K / Ctrl+K | Open command palette |
| ⌘B / Ctrl+B | Bold (when focused) |
| ⌘I / Ctrl+I | Italic (when focused) |
| ⌘Z / Ctrl+Z | Undo |
| ⌘Shift+Z | Redo |

## UI/UX Patterns

### Hover States
- **Toolbar**: Appears on editor hover
- **Reference Cards**: Show insert button on hover
- **Panel Toggles**: Highlight on hover

### Color Coding
- **Comments**: Blue accents
- **Suggestions**: Red (original) / Green (suggested)
- **Status Badges**: Green (accepted), Red (rejected), Gray (pending)
- **Presence**: Green (online), Yellow (away), Gray (offline)

### Animations
- Panel transitions: 300ms smooth slide
- Toolbar fade in/out: 200ms
- Status indicator: Pulse animation

## Future Enhancements

Planned features:
- [ ] LaTeX math equation editor
- [ ] Table of contents auto-generation
- [ ] Export to LaTeX, DOCX, Markdown
- [ ] Advanced search and replace
- [ ] Track changes mode
- [ ] Bibliography auto-formatting (APA, MLA, Chicago)
- [ ] Integration with Zotero/Mendeley
- [ ] Plagiarism checker
- [ ] Grammar and style suggestions
- [ ] Citation network visualization
- [ ] Document templates (research paper, thesis, etc.)
- [ ] Offline mode with local sync
- [ ] Mobile-responsive design

## Migration Notes

### From Original Editor

The enhanced editor maintains full backward compatibility:
- All existing documents work seamlessly
- WebSocket integration unchanged
- Share functionality preserved
- AI service integration maintained

### Breaking Changes
None - this is a drop-in replacement

## Performance Considerations

- Lazy loading for references list
- Virtual scrolling for large comment/history lists
- Debounced search in references
- Memoized components for collaborator avatars
- Optimistic UI updates for suggestions

## Accessibility

- Keyboard navigation support
- ARIA labels on all interactive elements
- Focus management in command palette
- Screen reader friendly
- High contrast mode compatible

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- No IE11 support (requires modern JavaScript features)

## Related Documentation

- [Frontend Architecture](./frontend.md)
- [Backend API](./backend.md)
- [Database Schema](./database-schema.md)
- [WebSocket Integration](./integrations.md)
