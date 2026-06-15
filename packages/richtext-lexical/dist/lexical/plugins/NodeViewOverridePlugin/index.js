'use client';

import { c as _c } from "react/compiler-runtime";
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext.js';
import { useEffect } from 'react';
import { useRichTextView } from '../../../field/RichTextViewProvider.js';
import { clearEditorNodeViews, registerEditorNodeViews } from '../../nodes/index.js';
export function NodeViewOverridePlugin() {
  const $ = _c(5);
  const [editor] = useLexicalComposerContext();
  const {
    currentView,
    views
  } = useRichTextView();
  let t0;
  let t1;
  if ($[0] !== currentView || $[1] !== editor || $[2] !== views) {
    t0 = () => {
      if (!views) {
        return;
      }
      if (currentView === "default") {
        if (views.default) {
          registerEditorNodeViews(editor, views.default?.nodes);
        } else {
          clearEditorNodeViews(editor);
        }
      } else {
        if (views[currentView]) {
          clearEditorNodeViews(editor);
          registerEditorNodeViews(editor, views[currentView]?.nodes);
        }
      }
    };
    t1 = [editor, views, currentView];
    $[0] = currentView;
    $[1] = editor;
    $[2] = views;
    $[3] = t0;
    $[4] = t1;
  } else {
    t0 = $[3];
    t1 = $[4];
  }
  useEffect(t0, t1);
  return null;
}
//# sourceMappingURL=index.js.map