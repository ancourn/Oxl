'use client';

import { useEffect, useState, useCallback } from 'react';

export interface KeyboardNavigationOptions {
  enabled?: boolean;
  loop?: boolean;
  selector?: string;
  containerRef?: React.RefObject<HTMLElement>;
}

export function useKeyboardNavigation(options: KeyboardNavigationOptions = {}) {
  const {
    enabled = true,
    loop = true,
    selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    containerRef
  } = options;

  const [currentIndex, setCurrentIndex] = useState(-1);
  const [elements, setElements] = useState<HTMLElement[]>([]);

  // Update focusable elements
  const updateElements = useCallback(() => {
    const container = containerRef?.current || document.body;
    const focusableElements = Array.from(container.querySelectorAll(selector)) as HTMLElement[];
    setElements(focusableElements);
    setCurrentIndex(-1);
  }, [selector, containerRef]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled || elements.length === 0) return;

    switch (event.key) {
      case 'Tab':
        if (event.shiftKey) {
          // Shift + Tab - navigate backwards
          event.preventDefault();
          const newIndex = currentIndex <= 0 ? (loop ? elements.length - 1 : 0) : currentIndex - 1;
          setCurrentIndex(newIndex);
          elements[newIndex]?.focus();
        } else {
          // Tab - navigate forwards
          event.preventDefault();
          const newIndex = currentIndex >= elements.length - 1 ? (loop ? 0 : elements.length - 1) : currentIndex + 1;
          setCurrentIndex(newIndex);
          elements[newIndex]?.focus();
        }
        break;

      case 'ArrowDown':
      case 'ArrowRight':
        // Arrow keys - navigate forwards
        if (event.target === document.body) {
          event.preventDefault();
          const newIndex = currentIndex >= elements.length - 1 ? (loop ? 0 : elements.length - 1) : currentIndex + 1;
          setCurrentIndex(newIndex);
          elements[newIndex]?.focus();
        }
        break;

      case 'ArrowUp':
      case 'ArrowLeft':
        // Arrow keys - navigate backwards
        if (event.target === document.body) {
          event.preventDefault();
          const newIndex = currentIndex <= 0 ? (loop ? elements.length - 1 : 0) : currentIndex - 1;
          setCurrentIndex(newIndex);
          elements[newIndex]?.focus();
        }
        break;

      case 'Enter':
      case ' ':
        // Activate focused element
        if (currentIndex >= 0 && elements[currentIndex]) {
          const element = elements[currentIndex];
          if (element.tagName === 'BUTTON' || element.tagName === 'A' || element.getAttribute('role') === 'button') {
            event.preventDefault();
            element.click();
          }
        }
        break;

      case 'Escape':
        // Reset focus
        setCurrentIndex(-1);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        break;

      default:
        break;
    }
  }, [enabled, elements, currentIndex, loop]);

  // Set up event listeners
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    
    // Initial update
    updateElements();

    // Update elements when DOM changes
    const observer = new MutationObserver(updateElements);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['tabindex', 'disabled', 'aria-hidden']
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      observer.disconnect();
    };
  }, [enabled, handleKeyDown, updateElements]);

  // Focus first element
  const focusFirst = useCallback(() => {
    if (elements.length > 0) {
      setCurrentIndex(0);
      elements[0]?.focus();
    }
  }, [elements]);

  // Focus last element
  const focusLast = useCallback(() => {
    if (elements.length > 0) {
      setCurrentIndex(elements.length - 1);
      elements[elements.length - 1]?.focus();
    }
  }, [elements]);

  // Focus specific element
  const focusElement = useCallback((index: number) => {
    if (index >= 0 && index < elements.length) {
      setCurrentIndex(index);
      elements[index]?.focus();
    }
  }, [elements]);

  return {
    currentIndex,
    elements,
    updateElements,
    focusFirst,
    focusLast,
    focusElement,
    setCurrentIndex
  };
}

// Hook for managing focus within a component
export function useFocusManagement<T extends HTMLElement>() {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = React.useRef<T>(null);

  const handleKeyDown = useCallback((event: React.KeyboardEvent, totalItems: number) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => (prev < totalItems - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : totalItems - 1));
        break;
      case 'Enter':
      case ' ':
        if (focusedIndex >= 0) {
          event.preventDefault();
          // Trigger action for focused item
          const focusedElement = containerRef.current?.querySelectorAll('[data-focusable]')[focusedIndex];
          if (focusedElement) {
            (focusedElement as HTMLElement).click();
          }
        }
        break;
      case 'Escape':
        setFocusedIndex(-1);
        break;
      default:
        break;
    }
  }, [focusedIndex]);

  return {
    containerRef,
    focusedIndex,
    setFocusedIndex,
    handleKeyDown
  };
}

// Hook for managing ARIA attributes
export function useAriaAttributes(
  type: 'button' | 'link' | 'menu' | 'dialog' | 'listbox' | 'combobox',
  options: {
    label?: string;
    describedBy?: string;
    expanded?: boolean;
    pressed?: boolean;
    selected?: boolean;
    disabled?: boolean;
  } = {}
) {
  const { label, describedBy, expanded, pressed, selected, disabled } = options;

  const getAriaProps = () => {
    const props: Record<string, string | boolean> = {};

    // Common attributes
    if (label) props['aria-label'] = label;
    if (describedBy) props['aria-describedby'] = describedBy;
    if (disabled) props['aria-disabled'] = disabled;

    // Type-specific attributes
    switch (type) {
      case 'button':
        if (pressed !== undefined) props['aria-pressed'] = pressed;
        break;
      case 'menu':
      case 'listbox':
      case 'combobox':
        if (expanded !== undefined) props['aria-expanded'] = expanded;
        break;
      case 'dialog':
        props['aria-modal'] = true;
        break;
    }

    return props;
  };

  return {
    getAriaProps,
    role: type
  };
}