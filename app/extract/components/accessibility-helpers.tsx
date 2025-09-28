/**
 * Extract Data v2 - Accessibility Helpers
 * Phase 4: ARIA labels, keyboard navigation, focus management
 */

import React, { useEffect, useRef } from 'react';

// Focus management hook
export function useFocusManagement(isActive: boolean) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isActive && ref.current) {
      // Focus the element when it becomes active
      ref.current.focus();
    }
  }, [isActive]);

  return ref;
}

// Keyboard navigation hook for tab-like interfaces
export function useKeyboardNavigation(
  items: string[],
  activeItem: string,
  onItemChange: (item: string) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const currentIndex = items.indexOf(activeItem);
      let newIndex = currentIndex;

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
          break;
        case 'Home':
          event.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          newIndex = items.length - 1;
          break;
        default:
          return;
      }

      onItemChange(items[newIndex]);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items, activeItem, onItemChange, enabled]);
}

// Screen reader announcements
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// Progress announcer component
interface ProgressAnnouncerProps {
  progress: number;
  phase: string;
  message?: string;
}

export function ProgressAnnouncer({ progress, phase, message }: ProgressAnnouncerProps) {
  const prevProgressRef = useRef(progress);
  const prevPhaseRef = useRef(phase);

  useEffect(() => {
    const prevProgress = prevProgressRef.current;
    const prevPhase = prevPhaseRef.current;

    // Announce significant progress changes
    if (progress - prevProgress >= 25 || phase !== prevPhase) {
      const announcement = message || `${phase} ${progress}% complete`;
      announceToScreenReader(announcement, 'polite');
    }

    prevProgressRef.current = progress;
    prevPhaseRef.current = phase;
  }, [progress, phase, message]);

  return (
    <div 
      aria-live="polite" 
      aria-atomic="true" 
      className="sr-only"
      role="status"
    >
      {message || `${phase} ${progress}% complete`}
    </div>
  );
}

// Skip link component
interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

export function SkipLink({ href, children }: SkipLinkProps) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-orange-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:text-sm focus:font-medium"
    >
      {children}
    </a>
  );
}

// Enhanced button with loading state and accessibility
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function AccessibleButton({
  loading = false,
  loadingText = 'Loading...',
  variant = 'primary',
  size = 'md',
  children,
  disabled,
  className = '',
  ...props
}: AccessibleButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors';
  
  const variantClasses = {
    primary: 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500 disabled:bg-orange-300',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-describedby={loading ? `${props.id}-loading` : undefined}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading && (
        <svg
          className="mr-2 h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {loading ? loadingText : children}
      {loading && (
        <span id={`${props.id}-loading`} className="sr-only">
          {loadingText}
        </span>
      )}
    </button>
  );
}

// Virtualized list for performance with accessibility
interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  className?: string;
  ariaLabel?: string;
}

export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  className = '',
  ariaLabel,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );
  
  const visibleItems = items.slice(visibleStart, visibleEnd);
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleStart * itemHeight;

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      role="list"
      aria-label={ariaLabel}
      tabIndex={0}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={visibleStart + index}
              style={{ height: itemHeight }}
              role="listitem"
            >
              {renderItem(item, visibleStart + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Safe text truncation that respects word boundaries
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > 0 
    ? truncated.slice(0, lastSpace) + '...'
    : truncated + '...';
}

// Debounced search input with accessibility
interface AccessibleSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  ariaLabel?: string;
  resultsCount?: number;
}

export function AccessibleSearch({
  value,
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
  ariaLabel = 'Search',
  resultsCount,
}: AccessibleSearchProps) {
  const [localValue, setLocalValue] = React.useState(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounceMs);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <input
        type="text"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-describedby={resultsCount !== undefined ? 'search-results-count' : undefined}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
      />
      {resultsCount !== undefined && (
        <div id="search-results-count" className="sr-only" aria-live="polite">
          {resultsCount} results found
        </div>
      )}
    </div>
  );
}
