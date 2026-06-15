'use client';

import { c as _c } from "react/compiler-runtime";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext.js';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import { useScrollInfo, useThrottledEffect, useTranslation } from '@davincios/ui';
import * as React from 'react';
import { useMemo } from 'react';
import { useEditorConfigContext } from '../../../../../lexical/config/client/EditorConfigProvider.js';
import { ToolbarButton } from '../../../shared/ToolbarButton/index.js';
import { ToolbarDropdown } from '../../../shared/ToolbarDropdown/index.js';
import { useToolbarStates } from '../../../shared/useToolbarStates.js';
function ButtonGroupItem({
  active,
  anchorElem,
  editor,
  enabled,
  item
}) {
  if (item.Component) {
    return item?.Component && /*#__PURE__*/_jsx(item.Component, {
      anchorElem: anchorElem,
      editor: editor,
      item: item
    }, item.key);
  }
  if (!item.ChildComponent) {
    return null;
  }
  return /*#__PURE__*/_jsx(ToolbarButton, {
    active: active,
    editor: editor,
    enabled: enabled,
    item: item,
    children: /*#__PURE__*/_jsx(item.ChildComponent, {})
  }, item.key);
}
function ToolbarGroupComponent({
  anchorElem,
  editor,
  editorConfig,
  group,
  index,
  toolbarStates
}) {
  const {
    i18n
  } = useTranslation();
  const {
    fieldProps: {
      featureClientSchemaMap,
      schemaPath
    }
  } = useEditorConfigContext();
  const groupState = toolbarStates.groupStates.get(group.key);
  const DropdownIcon = useMemo(() => {
    if (group.type !== 'dropdown') {
      return undefined;
    }
    const activeItem = groupState?.activeItems?.[0];
    if (activeItem) {
      return activeItem.ChildComponent;
    }
    return group.ChildComponent;
  }, [group, groupState?.activeItems]);
  const dropdownLabel = useMemo(() => {
    if (group.type !== 'dropdown') {
      return undefined;
    }
    const activeItems = groupState?.activeItems;
    if (!activeItems?.length) {
      return undefined;
    }
    if (activeItems.length > 1) {
      return i18n.t('lexical:general:toolbarItemsActive', {
        count: activeItems.length
      });
    }
    const item = activeItems[0];
    let label = item.key;
    if (item.label) {
      label = typeof item.label === 'function' ? item.label({
        featureClientSchemaMap,
        i18n,
        schemaPath
      }) : item.label;
    }
    if (label.length > 25) {
      label = label.substring(0, 25) + '...';
    }
    return label;
  }, [group, groupState?.activeItems, i18n, featureClientSchemaMap, schemaPath]);
  return /*#__PURE__*/_jsxs("div", {
    className: `fixed-toolbar__group fixed-toolbar__group-${group.key}`,
    "data-toolbar-group-key": group.key,
    children: [group.type === 'dropdown' && group.items.length && groupState ? /*#__PURE__*/_jsx(ToolbarDropdown, {
      anchorElem: anchorElem,
      editor: editor,
      group: group,
      groupState: groupState,
      Icon: DropdownIcon,
      itemsContainerClassNames: ['fixed-toolbar__dropdown-items'],
      label: dropdownLabel
    }) : null, group.type === 'buttons' && group.items.length ? group.items.map(item_0 => {
      const itemState = toolbarStates.itemStates.get(item_0.key);
      return /*#__PURE__*/_jsx(ButtonGroupItem, {
        active: itemState?.active ?? false,
        anchorElem: anchorElem,
        editor: editor,
        enabled: itemState?.enabled ?? true,
        item: item_0
      }, item_0.key);
    }) : null, index < editorConfig.features.toolbarFixed?.groups.length - 1 && /*#__PURE__*/_jsx("div", {
      className: "divider"
    })]
  }, group.key);
}
function FixedToolbar({
  anchorElem,
  clientProps,
  editor,
  editorConfig,
  parentWithFixedToolbar
}) {
  const currentToolbarRef = React.useRef(null);
  const isEditable = useLexicalEditable();
  const {
    y
  } = useScrollInfo();
  const toolbarStates = useToolbarStates(editor, editorConfig?.features?.toolbarFixed?.groups);
  // Memoize the parent toolbar element
  const parentToolbarElem = useMemo(() => {
    if (!parentWithFixedToolbar || clientProps?.disableIfParentHasFixedToolbar) {
      return null;
    }
    const parentEditorElem = parentWithFixedToolbar.editorContainerRef.current;
    let sibling = parentEditorElem.previousElementSibling;
    while (sibling) {
      if (sibling.classList.contains('fixed-toolbar')) {
        return sibling;
      }
      sibling = sibling.previousElementSibling;
    }
    return null;
  }, [clientProps?.disableIfParentHasFixedToolbar, parentWithFixedToolbar]);
  useThrottledEffect(() => {
    if (!parentToolbarElem) {
      // this also checks for clientProps?.disableIfParentHasFixedToolbar indirectly, see the parentToolbarElem useMemo
      return;
    }
    const currentToolbarElem = currentToolbarRef.current;
    if (!currentToolbarElem) {
      return;
    }
    const currentRect = currentToolbarElem.getBoundingClientRect();
    const parentRect = parentToolbarElem.getBoundingClientRect();
    // we only need to check for vertical overlap
    const overlapping = !(currentRect.bottom < parentRect.top || currentRect.top > parentRect.bottom);
    if (overlapping) {
      currentToolbarElem.classList.remove('fixed-toolbar');
      currentToolbarElem.classList.add('fixed-toolbar', 'fixed-toolbar--overlapping');
      parentToolbarElem.classList.remove('fixed-toolbar');
      parentToolbarElem.classList.add('fixed-toolbar', 'fixed-toolbar--hide');
    } else {
      if (!currentToolbarElem.classList.contains('fixed-toolbar--overlapping')) {
        return;
      }
      currentToolbarElem.classList.remove('fixed-toolbar--overlapping');
      currentToolbarElem.classList.add('fixed-toolbar');
      parentToolbarElem.classList.remove('fixed-toolbar--hide');
      parentToolbarElem.classList.add('fixed-toolbar');
    }
  }, 50, [currentToolbarRef, parentToolbarElem, y]);
  return /*#__PURE__*/_jsx("div", {
    className: "fixed-toolbar",
    onFocus: event => {
      // Prevent other focus events being triggered. Otherwise, if this was to be clicked while in a child editor,
      // the parent editor will be focused, and the child editor will lose focus.
      event.stopPropagation();
    },
    ref: currentToolbarRef,
    children: isEditable && /*#__PURE__*/_jsx(React.Fragment, {
      children: editorConfig?.features && editorConfig.features?.toolbarFixed?.groups.map((group, i) => {
        return /*#__PURE__*/_jsx(ToolbarGroupComponent, {
          anchorElem: anchorElem,
          editor: editor,
          editorConfig: editorConfig,
          group: group,
          index: i,
          toolbarStates: toolbarStates
        }, group.key);
      })
    })
  });
}
const getParentEditorWithFixedToolbar = editorConfigContext => {
  if (editorConfigContext.parentEditor?.editorConfig) {
    if (editorConfigContext.parentEditor?.editorConfig.resolvedFeatureMap.has('toolbarFixed')) {
      return editorConfigContext.parentEditor;
    } else {
      if (editorConfigContext.parentEditor) {
        return getParentEditorWithFixedToolbar(editorConfigContext.parentEditor);
      }
    }
  }
  return false;
};
export const FixedToolbarPlugin = t0 => {
  const $ = _c(6);
  const {
    clientProps
  } = t0;
  const [currentEditor] = useLexicalComposerContext();
  const editorConfigContext = useEditorConfigContext();
  const isEditable = useLexicalEditable();
  if (!isEditable) {
    return null;
  }
  const {
    editorConfig: currentEditorConfig
  } = editorConfigContext;
  const editor = clientProps.applyToFocusedEditor ? editorConfigContext.focusedEditor?.editor || currentEditor : currentEditor;
  const editorConfig = clientProps.applyToFocusedEditor ? editorConfigContext.focusedEditor?.editorConfig || currentEditorConfig : currentEditorConfig;
  let t1;
  let t2;
  if ($[0] !== clientProps || $[1] !== editor || $[2] !== editorConfig || $[3] !== editorConfigContext) {
    t2 = Symbol.for("react.early_return_sentinel");
    bb0: {
      const parentWithFixedToolbar = getParentEditorWithFixedToolbar(editorConfigContext);
      if (clientProps?.disableIfParentHasFixedToolbar) {
        if (parentWithFixedToolbar) {
          t2 = null;
          break bb0;
        }
      }
      if (!editorConfig?.features?.toolbarFixed?.groups?.length) {
        t2 = null;
        break bb0;
      }
      t1 = _jsx(FixedToolbar, {
        anchorElem: document.body,
        clientProps,
        editor,
        editorConfig,
        parentWithFixedToolbar
      });
    }
    $[0] = clientProps;
    $[1] = editor;
    $[2] = editorConfig;
    $[3] = editorConfigContext;
    $[4] = t1;
    $[5] = t2;
  } else {
    t1 = $[4];
    t2 = $[5];
  }
  if (t2 !== Symbol.for("react.early_return_sentinel")) {
    return t2;
  }
  return t1;
};
//# sourceMappingURL=index.js.map