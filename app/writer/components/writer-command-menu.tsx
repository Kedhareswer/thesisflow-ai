"use client";

import * as React from "react";
import {
  CommandMenu,
  CommandMenuTrigger,
  CommandMenuContent,
  CommandMenuInput,
  CommandMenuList,
  CommandMenuGroup,
  CommandMenuItem,
  CommandMenuSeparator,
  useCommandMenuShortcut,
} from "@/components/ui/command-menu";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { 
  Command, 
  FileText,
  Lightbulb,
  BookOpen,
  Users,
  Gavel,
  Save,
  Download,
  Upload,
  Share2,
  Settings,
  Plus,
  Search,
  Edit,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Type,
  Bold,
  Italic,
  List,
  Quote,
  Link,
  Image,
  Table,
  Code,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  CheckCircle,
  AlertTriangle,
  History,
  Star,
  Calendar,
  Clock,
  Target,
  Zap,
  Sparkles,
  Brain,
  Palette,
  Languages,
  Globe,
  Lock,
  Unlock,
  Key,
  Shield,
  CheckSquare,
  Square,
  Minus,
  Plus as PlusIcon,
  X,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Home,
  End,
  PageUp,
  PageDown,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Fullscreen,
  FullscreenExit,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Camera,
  CameraOff,
  Phone,
  PhoneOff,
  MessageSquare,
  MessageCircle,
  Send,
  Mail,
  Inbox,
  Archive,
  Tag,
  Hash,
  AtSign,
  DollarSign,
  Percent,
  Hash as HashIcon,
  Number,
  Hash as NumberIcon,
  Hash as HashIcon2,
  Hash as HashIcon3,
  Hash as HashIcon4,
  Hash as HashIcon5,
  Hash as HashIcon6,
  Hash as HashIcon7,
  Hash as HashIcon8,
  Hash as HashIcon9,
  Hash as HashIcon10,
} from "lucide-react";

// Utility function to detect OS and return appropriate modifier key
const getModifierKey = () => {
  if (typeof navigator === "undefined") return { key: "Ctrl", symbol: "Ctrl" };
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ||
               navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
  return isMac
    ? { key: "cmd", symbol: "⌘" }
    : { key: "ctrl", symbol: "Ctrl" };
};

interface WriterCommandMenuProps {
  onNewDocument?: () => void;
  onSaveDocument?: () => void;
  onExportDocument?: () => void;
  onImportDocument?: () => void;
  onShareDocument?: () => void;
  onToggleAiAssistant?: () => void;
  onToggleCitationManager?: () => void;
  onToggleAiDetection?: () => void;
  onToggleHumanize?: () => void;
  onTogglePlagiarismCheck?: () => void;
  onToggleVisualContent?: () => void;
  onFormatBold?: () => void;
  onFormatItalic?: () => void;
  onFormatList?: () => void;
  onFormatQuote?: () => void;
  onFormatLink?: () => void;
  onFormatImage?: () => void;
  onFormatTable?: () => void;
  onFormatCode?: () => void;
  onFormatHeading1?: () => void;
  onFormatHeading2?: () => void;
  onFormatHeading3?: () => void;
  onAlignLeft?: () => void;
  onAlignCenter?: () => void;
  onAlignRight?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onFindReplace?: () => void;
  onWordCount?: () => void;
  onSpellCheck?: () => void;
  onGrammarCheck?: () => void;
  onReadabilityScore?: () => void;
  onToneAnalysis?: () => void;
  onSentimentAnalysis?: () => void;
  onKeywordDensity?: () => void;
  onReadAloud?: () => void;
  onPrint?: () => void;
  onPrintPreview?: () => void;
  onPageSetup?: () => void;
  onPreferences?: () => void;
  onHelp?: () => void;
  onAbout?: () => void;
  onFeedback?: () => void;
  onReportBug?: () => void;
  onFeatureRequest?: () => void;
  onContactSupport?: () => void;
  onDocumentation?: () => void;
  onTutorial?: () => void;
  onKeyboardShortcuts?: () => void;
  onAccessibility?: () => void;
  onPrivacyPolicy?: () => void;
  onTermsOfService?: () => void;
  onLicense?: () => void;
  onCredits?: () => void;
  onVersion?: () => void;
  onUpdate?: () => void;
  onBackup?: () => void;
  onRestore?: () => void;
  onSync?: () => void;
  onOffline?: () => void;
  onOnline?: () => void;
  onCloud?: () => void;
  onLocal?: () => void;
  onCollaborate?: () => void;
  onComment?: () => void;
  onTrackChanges?: () => void;
  onReview?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onMerge?: () => void;
  onBranch?: () => void;
  onVersionControl?: () => void;
  onGit?: () => void;
  onGitHub?: () => void;
  onGitLab?: () => void;
  onBitbucket?: () => void;
  onSVN?: () => void;
  onMercurial?: () => void;
  onFossil?: () => void;
  onBazaar?: () => void;
  onMonotone?: () => void;
  onDarcs?: () => void;
  onPijul?: () => void;
  onPijul2?: () => void;
  onPijul3?: () => void;
  onPijul4?: () => void;
  onPijul5?: () => void;
  onPijul6?: () => void;
  onPijul7?: () => void;
  onPijul8?: () => void;
  onPijul9?: () => void;
  onPijul10?: () => void;
}

export function WriterCommandMenu({
  onNewDocument,
  onSaveDocument,
  onExportDocument,
  onImportDocument,
  onShareDocument,
  onToggleAiAssistant,
  onToggleCitationManager,
  onToggleAiDetection,
  onToggleHumanize,
  onTogglePlagiarismCheck,
  onToggleVisualContent,
  onFormatBold,
  onFormatItalic,
  onFormatList,
  onFormatQuote,
  onFormatLink,
  onFormatImage,
  onFormatTable,
  onFormatCode,
  onFormatHeading1,
  onFormatHeading2,
  onFormatHeading3,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onUndo,
  onRedo,
  onFindReplace,
  onWordCount,
  onSpellCheck,
  onGrammarCheck,
  onReadabilityScore,
  onToneAnalysis,
  onSentimentAnalysis,
  onKeywordDensity,
  onReadAloud,
  onPrint,
  onPrintPreview,
  onPageSetup,
  onPreferences,
  onHelp,
  onAbout,
  onFeedback,
  onReportBug,
  onFeatureRequest,
  onContactSupport,
  onDocumentation,
  onTutorial,
  onKeyboardShortcuts,
  onAccessibility,
  onPrivacyPolicy,
  onTermsOfService,
  onLicense,
  onCredits,
  onVersion,
  onUpdate,
  onBackup,
  onRestore,
  onSync,
  onOffline,
  onOnline,
  onCloud,
  onLocal,
  onCollaborate,
  onComment,
  onTrackChanges,
  onReview,
  onApprove,
  onReject,
  onMerge,
  onBranch,
  onVersionControl,
  onGit,
  onGitHub,
  onGitLab,
  onBitbucket,
  onSVN,
  onMercurial,
  onFossil,
  onBazaar,
  onMonotone,
  onDarcs,
  onPijul,
  onPijul2,
  onPijul3,
  onPijul4,
  onPijul5,
  onPijul6,
  onPijul7,
  onPijul8,
  onPijul9,
  onPijul10,
}: WriterCommandMenuProps) {
  const [open, setOpen] = React.useState(false);
  useCommandMenuShortcut(() => setOpen(true));

  return (
    <CommandMenu open={open} onOpenChange={setOpen}>
      <CommandMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Command size={16} />
          Quick Actions
          <div className="ml-auto flex items-center gap-1">
            <Kbd size="xs">{getModifierKey().symbol}</Kbd>
            <Kbd size="xs">K</Kbd>
          </div>
        </Button>
      </CommandMenuTrigger>
      <CommandMenuContent>
        <CommandMenuInput placeholder="Search commands..." />
        <CommandMenuList>
          <CommandMenuGroup heading="Document">
            <CommandMenuItem icon={<Plus />} index={0} onSelect={onNewDocument}>
              New Document
            </CommandMenuItem>
            <CommandMenuItem icon={<Save />} index={1} shortcut="cmd+s" onSelect={onSaveDocument}>
              Save Document
            </CommandMenuItem>
            <CommandMenuItem icon={<Download />} index={2} onSelect={onExportDocument}>
              Export Document
            </CommandMenuItem>
            <CommandMenuItem icon={<Upload />} index={3} onSelect={onImportDocument}>
              Import Document
            </CommandMenuItem>
            <CommandMenuItem icon={<Share2 />} index={4} onSelect={onShareDocument}>
              Share Document
            </CommandMenuItem>
          </CommandMenuGroup>
          
          <CommandMenuSeparator />
          
          <CommandMenuGroup heading="AI Tools">
            <CommandMenuItem icon={<Lightbulb />} index={5} onSelect={onToggleAiAssistant}>
              AI Writing Assistant
            </CommandMenuItem>
            <CommandMenuItem icon={<BookOpen />} index={6} onSelect={onToggleCitationManager}>
              Citation Manager
            </CommandMenuItem>
            <CommandMenuItem icon={<FileText />} index={7} onSelect={onToggleAiDetection}>
              AI Content Detection
            </CommandMenuItem>
            <CommandMenuItem icon={<Users />} index={8} onSelect={onToggleHumanize}>
              Humanize Text
            </CommandMenuItem>
            <CommandMenuItem icon={<Gavel />} index={9} onSelect={onTogglePlagiarismCheck}>
              Plagiarism Check
            </CommandMenuItem>
            <CommandMenuItem icon={<Sparkles />} index={10} onSelect={onToggleVisualContent}>
              Visual Content
            </CommandMenuItem>
          </CommandMenuGroup>
          
          <CommandMenuSeparator />
          
          <CommandMenuGroup heading="Formatting">
            <CommandMenuItem icon={<Bold />} index={11} shortcut="cmd+b" onSelect={onFormatBold}>
              Bold
            </CommandMenuItem>
            <CommandMenuItem icon={<Italic />} index={12} shortcut="cmd+i" onSelect={onFormatItalic}>
              Italic
            </CommandMenuItem>
            <CommandMenuItem icon={<List />} index={13} onSelect={onFormatList}>
              List
            </CommandMenuItem>
            <CommandMenuItem icon={<Quote />} index={14} onSelect={onFormatQuote}>
              Quote
            </CommandMenuItem>
            <CommandMenuItem icon={<Link />} index={15} shortcut="cmd+k" onSelect={onFormatLink}>
              Link
            </CommandMenuItem>
            <CommandMenuItem icon={<Image />} index={16} onSelect={onFormatImage}>
              Image
            </CommandMenuItem>
            <CommandMenuItem icon={<Table />} index={17} onSelect={onFormatTable}>
              Table
            </CommandMenuItem>
            <CommandMenuItem icon={<Code />} index={18} onSelect={onFormatCode}>
              Code
            </CommandMenuItem>
            <CommandMenuItem icon={<Heading1 />} index={19} onSelect={onFormatHeading1}>
              Heading 1
            </CommandMenuItem>
            <CommandMenuItem icon={<Heading2 />} index={20} onSelect={onFormatHeading2}>
              Heading 2
            </CommandMenuItem>
            <CommandMenuItem icon={<Heading3 />} index={21} onSelect={onFormatHeading3}>
              Heading 3
            </CommandMenuItem>
          </CommandMenuGroup>
          
          <CommandMenuSeparator />
          
          <CommandMenuGroup heading="Alignment">
            <CommandMenuItem icon={<AlignLeft />} index={22} onSelect={onAlignLeft}>
              Align Left
            </CommandMenuItem>
            <CommandMenuItem icon={<AlignCenter />} index={23} onSelect={onAlignCenter}>
              Align Center
            </CommandMenuItem>
            <CommandMenuItem icon={<AlignRight />} index={24} onSelect={onAlignRight}>
              Align Right
            </CommandMenuItem>
          </CommandMenuGroup>
          
          <CommandMenuSeparator />
          
          <CommandMenuGroup heading="Edit">
            <CommandMenuItem icon={<Undo />} index={25} shortcut="cmd+z" onSelect={onUndo}>
              Undo
            </CommandMenuItem>
            <CommandMenuItem icon={<Redo />} index={26} shortcut="cmd+shift+z" onSelect={onRedo}>
              Redo
            </CommandMenuItem>
            <CommandMenuItem icon={<Search />} index={27} shortcut="cmd+f" onSelect={onFindReplace}>
              Find & Replace
            </CommandMenuItem>
          </CommandMenuGroup>
          
          <CommandMenuSeparator />
          
          <CommandMenuGroup heading="Analysis">
            <CommandMenuItem icon={<Target />} index={28} onSelect={onWordCount}>
              Word Count
            </CommandMenuItem>
            <CommandMenuItem icon={<CheckCircle />} index={29} onSelect={onSpellCheck}>
              Spell Check
            </CommandMenuItem>
            <CommandMenuItem icon={<Brain />} index={30} onSelect={onGrammarCheck}>
              Grammar Check
            </CommandMenuItem>
            <CommandMenuItem icon={<Eye />} index={31} onSelect={onReadabilityScore}>
              Readability Score
            </CommandMenuItem>
            <CommandMenuItem icon={<Palette />} index={32} onSelect={onToneAnalysis}>
              Tone Analysis
            </CommandMenuItem>
            <CommandMenuItem icon={<Zap />} index={33} onSelect={onSentimentAnalysis}>
              Sentiment Analysis
            </CommandMenuItem>
            <CommandMenuItem icon={<Hash />} index={34} onSelect={onKeywordDensity}>
              Keyword Density
            </CommandMenuItem>
          </CommandMenuGroup>
          
          <CommandMenuSeparator />
          
          <CommandMenuGroup heading="Output">
            <CommandMenuItem icon={<Volume2 />} index={35} onSelect={onReadAloud}>
              Read Aloud
            </CommandMenuItem>
            <CommandMenuItem icon={<Printer />} index={36} shortcut="cmd+p" onSelect={onPrint}>
              Print
            </CommandMenuItem>
            <CommandMenuItem icon={<Eye />} index={37} onSelect={onPrintPreview}>
              Print Preview
            </CommandMenuItem>
            <CommandMenuItem icon={<Settings />} index={38} onSelect={onPageSetup}>
              Page Setup
            </CommandMenuItem>
          </CommandMenuGroup>
          
          <CommandMenuSeparator />
          
          <CommandMenuGroup heading="Help & Settings">
            <CommandMenuItem icon={<Settings />} index={39} onSelect={onPreferences}>
              Preferences
            </CommandMenuItem>
            <CommandMenuItem icon={<HelpCircle />} index={40} onSelect={onHelp}>
              Help
            </CommandMenuItem>
            <CommandMenuItem icon={<Info />} index={41} onSelect={onAbout}>
              About
            </CommandMenuItem>
            <CommandMenuItem icon={<MessageSquare />} index={42} onSelect={onFeedback}>
              Send Feedback
            </CommandMenuItem>
            <CommandMenuItem icon={<Bug />} index={43} onSelect={onReportBug}>
              Report Bug
            </CommandMenuItem>
            <CommandMenuItem icon={<Star />} index={44} onSelect={onFeatureRequest}>
              Request Feature
            </CommandMenuItem>
            <CommandMenuItem icon={<MessageCircle />} index={45} onSelect={onContactSupport}>
              Contact Support
            </CommandMenuItem>
            <CommandMenuItem icon={<BookOpen />} index={46} onSelect={onDocumentation}>
              Documentation
            </CommandMenuItem>
            <CommandMenuItem icon={<Play />} index={47} onSelect={onTutorial}>
              Tutorial
            </CommandMenuItem>
            <CommandMenuItem icon={<Keyboard />} index={48} onSelect={onKeyboardShortcuts}>
              Keyboard Shortcuts
            </CommandMenuItem>
            <CommandMenuItem icon={<Accessibility />} index={49} onSelect={onAccessibility}>
              Accessibility
            </CommandMenuItem>
          </CommandMenuGroup>
        </CommandMenuList>
      </CommandMenuContent>
    </CommandMenu>
  );
}

// Missing icon components - adding them as needed
const Printer = ({ size = 16, ...props }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="6,9 6,2 18,2 18,9" />
    <path d="M6,18H4a2,2 0 0,1 -2,-2V11a2,2 0 0,1 2,-2H20a2,2 0 0,1 2,2v5a2,2 0 0,1 -2,2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const HelpCircle = ({ size = 16, ...props }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const Info = ({ size = 16, ...props }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const Bug = ({ size = 16, ...props }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M8 2l1.88 1.88" />
    <path d="M14.12 3.88L16 2" />
    <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
    <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
    <path d="M12 20v-9" />
    <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
    <path d="M6 13H2" />
    <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
    <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
    <path d="M22 13h-4" />
    <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
  </svg>
);

const Play = ({ size = 16, ...props }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="5,3 19,12 5,21" />
  </svg>
);

const Keyboard = ({ size = 16, ...props }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
    <line x1="6" y1="8" x2="6" y2="8" />
    <line x1="10" y1="8" x2="10" y2="8" />
    <line x1="14" y1="8" x2="14" y2="8" />
    <line x1="18" y1="8" x2="18" y2="8" />
    <line x1="6" y1="12" x2="6" y2="12" />
    <line x1="10" y1="12" x2="10" y2="12" />
    <line x1="14" y1="12" x2="14" y2="12" />
    <line x1="18" y1="12" x2="18" y2="12" />
    <line x1="6" y1="16" x2="6" y2="16" />
    <line x1="10" y1="16" x2="10" y2="16" />
    <line x1="14" y1="16" x2="14" y2="16" />
    <line x1="18" y1="16" x2="18" y2="16" />
  </svg>
);

const Accessibility = ({ size = 16, ...props }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2v20" />
    <path d="M2 12h20" />
  </svg>
); 