'use client';

import { c as _c } from "react/compiler-runtime";
import { jsx as _jsx } from "react/jsx-runtime";
import { $addUpdateTag } from 'lexical';
import React, { useCallback, useMemo } from 'react';
const baseClass = 'toolbar-popup__button';
export const ToolbarButton = t0 => {
  const $ = _c(14);
  const {
    active: t1,
    children,
    editor,
    enabled: t2,
    item
  } = t0;
  const active = t1 === undefined ? false : t1;
  const enabled = t2 === undefined ? true : t2;
  const t3 = !enabled ? "disabled" : "";
  const t4 = active ? "active" : "";
  const t5 = item.key ? `${baseClass}-${item.key}` : "";
  let t6;
  if ($[0] !== t3 || $[1] !== t4 || $[2] !== t5) {
    t6 = [baseClass, t3, t4, t5].filter(Boolean);
    $[0] = t3;
    $[1] = t4;
    $[2] = t5;
    $[3] = t6;
  } else {
    t6 = $[3];
  }
  const className = t6.join(" ");
  let t7;
  if ($[4] !== active || $[5] !== editor || $[6] !== enabled || $[7] !== item) {
    t7 = () => {
      if (!enabled) {
        return;
      }
      editor.focus(() => {
        editor.update(_temp);
        item.onSelect?.({
          editor,
          isActive: active
        });
      });
    };
    $[4] = active;
    $[5] = editor;
    $[6] = enabled;
    $[7] = item;
    $[8] = t7;
  } else {
    t7 = $[8];
  }
  const handleClick = t7;
  const handleMouseDown = _temp2;
  let t8;
  if ($[9] !== children || $[10] !== className || $[11] !== handleClick || $[12] !== item.key) {
    t8 = _jsx("button", {
      className,
      "data-button-key": item.key,
      onClick: handleClick,
      onMouseDown: handleMouseDown,
      type: "button",
      children
    });
    $[9] = children;
    $[10] = className;
    $[11] = handleClick;
    $[12] = item.key;
    $[13] = t8;
  } else {
    t8 = $[13];
  }
  return t8;
};
function _temp() {
  $addUpdateTag("toolbar");
}
function _temp2(e) {
  e.preventDefault();
}
//# sourceMappingURL=index.js.map