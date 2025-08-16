'use client';

import { ReactNode } from 'react';
import { useKeyboardNavigation } from '@/hooks/use-keyboard-navigation';

interface AccessibilityWrapperProps {
  children: ReactNode;
  role?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  tabIndex?: number;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  className?: string;
}

export function AccessibilityWrapper({
  children,
  role,
  ariaLabel,
  ariaDescribedBy,
  tabIndex = 0,
  onKeyDown,
  className = ''
}: AccessibilityWrapperProps) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Handle common keyboard interactions
    switch (event.key) {
      case 'Enter':
      case ' ':
        if (role === 'button' || role === 'link') {
          event.preventDefault();
          // Trigger click action
          const element = event.currentTarget as HTMLElement;
          element.click();
        }
        break;
      case 'Escape':
        // Close modals, dropdowns, etc.
        if (role === 'dialog' || role === 'menu') {
          event.preventDefault();
          // Trigger close action
          const closeButton = element.querySelector('[aria-label="Close"], [aria-label="close"]');
          if (closeButton) {
            (closeButton as HTMLElement).click();
          }
        }
        break;
      default:
        break;
    }

    // Call custom onKeyDown if provided
    if (onKeyDown) {
      onKeyDown(event);
    }
  };

  const props: React.HTMLAttributes<HTMLElement> = {
    className,
    tabIndex,
    onKeyDown: handleKeyDown,
  };

  if (role) props.role = role;
  if (ariaLabel) props['aria-label'] = ariaLabel;
  if (ariaDescribedBy) props['aria-describedby'] = ariaDescribedBy;

  return (
    <div {...props}>
      {children}
    </div>
  );
}

// High contrast mode support
export function HighContrastWrapper({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`high-contrast-support ${className}`}>
      {children}
    </div>
  );
}

// Screen reader only content
export function ScreenReaderOnly({ children }: { children: ReactNode }) {
  return (
    <span className="sr-only" aria-live="polite">
      {children}
    </span>
  );
}

// Focus management for modals and dialogs
export function FocusTrap({ children, isActive = true }: { children: ReactNode; isActive?: boolean }) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

  return (
    <div ref={containerRef} className="focus-trap">
      {children}
    </div>
  );
}