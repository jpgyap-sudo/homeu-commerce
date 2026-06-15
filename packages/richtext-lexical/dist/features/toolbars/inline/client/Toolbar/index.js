'use client';

import { c as _c } from "react/compiler-runtime";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext.js';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import { mergeRegister } from '@lexical/utils';
import { $getSelection, $isRangeSelection, $isTextNode, COMMAND_PRIORITY_LOW, getDOMSelection, SELECTION_CHANGE_COMMAND } from 'lexical';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { useEditorConfigContext } from '../../../../../lexical/config/client/EditorConfigProvider.js';
import { getDOMRangeRect } from '../../../../../lexical/utils/getDOMRangeRect.js';
import { setFloatingElemPosition } from '../../../../../lexical/utils/setFloatingElemPosition.js';
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
  group,
  index,
  toolbarStates
}) {
  const {
    editorConfig
  } = useEditorConfigContext();
  const groupState = toolbarStates.groupStates.get(group.key);
  const DropdownIcon = useMemo(() => {
    if (group.type !== 'dropdown') {
      return undefined;
    }
    const activeItem = groupState?.activeItems?.[0];
    return activeItem?.ChildComponent ?? group.ChildComponent;
  }, [group, groupState?.activeItems]);
  return /*#__PURE__*/_jsxs("div", {
    className: `inline-toolbar-popup__group inline-toolbar-popup__group-${group.key}`,
    "data-toolbar-group-key": group.key,
    children: [group.type === 'dropdown' && group.items.length && groupState ? /*#__PURE__*/_jsx(ToolbarDropdown, {
      anchorElem: anchorElem,
      editor: editor,
      group: group,
      groupState: groupState,
      Icon: DropdownIcon
    }) : null, group.type === 'buttons' && group.items.length ? group.items.map(item => {
      const itemState = toolbarStates.itemStates.get(item.key);
      return /*#__PURE__*/_jsx(ButtonGroupItem, {
        active: itemState?.active ?? false,
        anchorElem: anchorElem,
        editor: editor,
        enabled: itemState?.enabled ?? true,
        item: item
      }, item.key);
    }) : null, index < editorConfig.features.toolbarInline?.groups.length - 1 && /*#__PURE__*/_jsx("div", {
      className: "divider"
    })]
  }, group.key);
}
function InlineToolbar({
  anchorElem,
  editor
}) {
  const floatingToolbarRef = useRef(null);
  const caretRef = useRef(null);
  const {
    editorConfig
  } = useEditorConfigContext();
  const toolbarStates = useToolbarStates(editor, editorConfig?.features?.toolbarInline?.groups);
  const closeFloatingToolbar = useCallback(() => {
    if (floatingToolbarRef?.current) {
      const isOpacityZero = floatingToolbarRef.current.style.opacity === '0';
      const isPointerEventsNone = floatingToolbarRef.current.style.pointerEvents === 'none';
      if (!isOpacityZero) {
        floatingToolbarRef.current.style.opacity = '0';
      }
      if (!isPointerEventsNone) {
        floatingToolbarRef.current.style.pointerEvents = 'none';
      }
    }
  }, [floatingToolbarRef]);
  const mouseMoveListener = useCallback(e => {
    if (floatingToolbarRef?.current && (e.buttons === 1 || e.buttons === 3)) {
      const isOpacityZero_0 = floatingToolbarRef.current.style.opacity === '0';
      const isPointerEventsNone_0 = floatingToolbarRef.current.style.pointerEvents === 'none';
      if (!isOpacityZero_0 || !isPointerEventsNone_0) {
        // Check if the mouse is not over the popup
        const x = e.clientX;
        const y = e.clientY;
        const elementUnderMouse = document.elementFromPoint(x, y);
        if (!floatingToolbarRef.current.contains(elementUnderMouse)) {
          // Mouse is not over the target element => not a normal click, but probably a drag
          closeFloatingToolbar();
        }
      }
    }
  }, [closeFloatingToolbar]);
  const mouseUpListener = useCallback(() => {
    if (floatingToolbarRef?.current) {
      if (floatingToolbarRef.current.style.opacity !== '1') {
        floatingToolbarRef.current.style.opacity = '1';
      }
      if (floatingToolbarRef.current.style.pointerEvents !== 'auto') {
        floatingToolbarRef.current.style.pointerEvents = 'auto';
      }
    }
  }, []);
  useEffect(() => {
    document.addEventListener('mousemove', mouseMoveListener);
    document.addEventListener('mouseup', mouseUpListener);
    return () => {
      document.removeEventListener('mousemove', mouseMoveListener);
      document.removeEventListener('mouseup', mouseUpListener);
    };
  }, [floatingToolbarRef, mouseMoveListener, mouseUpListener]);
  const $updateTextFormatFloatingToolbar = useCallback(() => {
    const selection = $getSelection();
    const nativeSelection = getDOMSelection(editor._window);
    if (floatingToolbarRef.current === null) {
      return;
    }
    const possibleLinkEditor = anchorElem.querySelector(':scope > .link-editor');
    const isLinkEditorVisible = possibleLinkEditor !== null && 'style' in possibleLinkEditor && possibleLinkEditor?.style?.['opacity'] === '1';
    const rootElement = editor.getRootElement();
    if (selection !== null && nativeSelection !== null && !nativeSelection.isCollapsed && rootElement !== null && rootElement.contains(nativeSelection.anchorNode)) {
      const rangeRect = getDOMRangeRect(nativeSelection, rootElement);
      // Position floating toolbar
      const offsetIfFlipped = setFloatingElemPosition({
        alwaysDisplayOnTop: isLinkEditorVisible,
        anchorElem,
        floatingElem: floatingToolbarRef.current,
        horizontalPosition: 'center',
        targetRect: rangeRect
      });
      // Position caret
      if (caretRef.current) {
        setFloatingElemPosition({
          anchorElem: floatingToolbarRef.current,
          anchorFlippedOffset: offsetIfFlipped,
          floatingElem: caretRef.current,
          horizontalOffset: 5,
          horizontalPosition: 'center',
          specialHandlingForCaret: true,
          targetRect: rangeRect,
          verticalGap: 8
        });
      }
    } else {
      closeFloatingToolbar();
    }
  }, [editor, closeFloatingToolbar, anchorElem]);
  useEffect(() => {
    const scrollerElem = anchorElem.parentElement;
    const update = () => {
      editor.getEditorState().read(() => {
        $updateTextFormatFloatingToolbar();
      });
    };
    window.addEventListener('resize', update);
    if (scrollerElem) {
      scrollerElem.addEventListener('scroll', update);
    }
    return () => {
      window.removeEventListener('resize', update);
      if (scrollerElem) {
        scrollerElem.removeEventListener('scroll', update);
      }
    };
  }, [editor, $updateTextFormatFloatingToolbar, anchorElem]);
  useEffect(() => {
    editor.getEditorState().read(() => {
      $updateTextFormatFloatingToolbar();
    });
    return mergeRegister(editor.registerUpdateListener(({
      editorState
    }) => {
      editorState.read(() => {
        $updateTextFormatFloatingToolbar();
      });
    }), editor.registerCommand(SELECTION_CHANGE_COMMAND, () => {
      $updateTextFormatFloatingToolbar();
      return false;
    }, COMMAND_PRIORITY_LOW));
  }, [editor, $updateTextFormatFloatingToolbar]);
  return /*#__PURE__*/_jsxs("div", {
    className: "inline-toolbar-popup",
    ref: floatingToolbarRef,
    children: [/*#__PURE__*/_jsx("div", {
      className: "caret",
      ref: caretRef
    }), editorConfig?.features && editorConfig.features?.toolbarInline?.groups.map((group, i) => {
      return /*#__PURE__*/_jsx(ToolbarGroupComponent, {
        anchorElem: anchorElem,
        editor: editor,
        group: group,
        index: i,
        toolbarStates: toolbarStates
      }, group.key);
    })]
  });
}
function useInlineToolbar(editor, anchorElem) {
  const $ = _c(12);
  const [isText, setIsText] = useState(false);
  const isEditable = useLexicalEditable();
  let t0;
  if ($[0] !== editor) {
    t0 = () => {
      editor.getEditorState().read(() => {
        if (editor.isComposing()) {
          return;
        }
        const selection = $getSelection();
        const nativeSelection = getDOMSelection(editor._window);
        const rootElement = editor.getRootElement();
        if (nativeSelection !== null && (!$isRangeSelection(selection) || rootElement === null || !rootElement.contains(nativeSelection.anchorNode))) {
          setIsText(false);
          return;
        }
        if (!$isRangeSelection(selection)) {
          return;
        }
        if (selection.getTextContent() !== "") {
          const nodes = selection.getNodes();
          let foundNodeWithText = false;
          for (const node of nodes) {
            if ($isTextNode(node)) {
              setIsText(true);
              foundNodeWithText = true;
              break;
            }
          }
          if (!foundNodeWithText) {
            setIsText(false);
          }
        } else {
          setIsText(false);
        }
        const rawTextContent = selection.getTextContent().replace(/\n/g, "");
        if (!selection.isCollapsed() && rawTextContent === "") {
          setIsText(false);
          return;
        }
      });
    };
    $[0] = editor;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const updatePopup = t0;
  let t1;
  let t2;
  if ($[2] !== updatePopup) {
    t1 = () => {
      document.addEventListener("selectionchange", updatePopup);
      document.addEventListener("mouseup", updatePopup);
      return () => {
        document.removeEventListener("selectionchange", updatePopup);
        document.removeEventListener("mouseup", updatePopup);
      };
    };
    t2 = [updatePopup];
    $[2] = updatePopup;
    $[3] = t1;
    $[4] = t2;
  } else {
    t1 = $[3];
    t2 = $[4];
  }
  useEffect(t1, t2);
  let t3;
  let t4;
  if ($[5] !== editor || $[6] !== updatePopup) {
    t3 = () => mergeRegister(editor.registerUpdateListener(() => {
      updatePopup();
    }), editor.registerRootListener(() => {
      if (editor.getRootElement() === null) {
        setIsText(false);
      }
    }));
    t4 = [editor, updatePopup];
    $[5] = editor;
    $[6] = updatePopup;
    $[7] = t3;
    $[8] = t4;
  } else {
    t3 = $[7];
    t4 = $[8];
  }
  useEffect(t3, t4);
  if (!isText || !isEditable) {
    return null;
  }
  let t5;
  if ($[9] !== anchorElem || $[10] !== editor) {
    t5 = createPortal(_jsx(InlineToolbar, {
      anchorElem,
      editor
    }), anchorElem);
    $[9] = anchorElem;
    $[10] = editor;
    $[11] = t5;
  } else {
    t5 = $[11];
  }
  return t5;
}
export const InlineToolbarPlugin = t0 => {
  const {
    anchorElem
  } = t0;
  const [editor] = useLexicalComposerContext();
  return useInlineToolbar(editor, anchorElem);
};
//# sourceMappingURL=index.js.map