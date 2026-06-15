'use client';

import { jsx as _jsx } from "react/jsx-runtime";
import { useControllableState } from '@davincios/ui';
import React, { createContext, use, useMemo } from 'react';
const RichTextViewContext = /*#__PURE__*/createContext({
  currentView: 'default',
  inheritable: false,
  setCurrentView: () => {}
});
/**
 * Provider for managing richtext editor view state and its inheritance.
 *
 * Handles two key scenarios:
 * 1. **Explicit view setting**: Wrap with `currentView` and `inheritable={true}` to force nested editors to a specific view
 * 2. **View map inheritance**: Nested editors inherit `views` from parents, allowing view switching across the hierarchy
 *
 * When a nested editor inherits from a parent, its ViewSelector is hidden because the view is controlled by an ancestor.
 *
 * @example
 * Force all nested richtext editors to use "frontend" view:
 * ```tsx
 * <RichTextViewProvider currentView="frontend" inheritable={true}>
 *   <MyForm /> {/* All richtext fields inside will use "frontend" view }
 * </RichTextViewProvider>
 * ```
 */
export const RichTextViewProvider = args => {
  const parentContext = useRichTextView();
  // Track if this provider explicitly sets currentView (not just using the default)
  const hasOwnExplicitView = args.currentView !== undefined;
  const isControlledByParent = parentContext.inheritable && (Boolean(parentContext.views) || Boolean(parentContext.hasExplicitCurrentView));
  // This provider has explicit currentView if it sets one OR inherits one from parent
  const hasExplicitCurrentView = hasOwnExplicitView || parentContext.inheritable && Boolean(parentContext.hasExplicitCurrentView);
  const {
    children,
    currentView: currentViewFromProps,
    inheritable,
    views
  } = {
    children: args.children,
    currentView: isControlledByParent ? parentContext.currentView : args.currentView,
    // Propagate inheritable flag through the hierarchy
    inheritable: parentContext.inheritable || args.inheritable,
    // Only inherit views if parent has a views map
    views: isControlledByParent && parentContext.views ? parentContext.views : args.views
  };
  const [currentViewRaw, setCurrentView] = useControllableState(currentViewFromProps, 'default');
  // Normalize currentView: if the requested view doesn't exist in this editor's
  // views map, fall back to 'default'. This ensures all consumers of useRichTextView()
  // see a consistent currentView that actually exists
  const currentView = views && currentViewRaw !== 'default' && !views[currentViewRaw] ? 'default' : currentViewRaw;
  const value = useMemo(() => {
    const currentViewMap = views ? views[currentView] : undefined;
    return {
      currentView,
      currentViewMap,
      hasExplicitCurrentView,
      inheritable,
      isControlledByParent,
      setCurrentView,
      views
    };
  }, [currentView, inheritable, hasExplicitCurrentView, isControlledByParent, setCurrentView, views]);
  return /*#__PURE__*/_jsx(RichTextViewContext, {
    value: value,
    children: children
  });
};
/**
 * Access the current richtext editor view context.
 *
 * Returns the active view name, node overrides, inheritance state, and a function to switch views.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { currentView, currentViewMap, isControlledByParent, setCurrentView } = useRichTextView()
 *
 *   return (
 *     <div>
 *       <p>Active view: {currentView}</p>
 *       {isControlledByParent && <p>View controlled by parent</p>}
 *       {currentViewMap?.heading && <p>Custom heading renderer active</p>}
 *       <button onClick={() => setCurrentView('frontend')}>Switch to frontend</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useRichTextView() {
  return use(RichTextViewContext);
}
//# sourceMappingURL=RichTextViewProvider.js.map