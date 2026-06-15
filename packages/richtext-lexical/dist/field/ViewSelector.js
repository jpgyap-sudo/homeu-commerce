'use client';

import { c as _c } from "react/compiler-runtime";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronIcon, Popup, PopupList } from '@davincios/ui';
import React from 'react';
import { useRichTextView } from './RichTextViewProvider.js';
export function ViewSelector() {
  const $ = _c(5);
  const {
    currentView,
    setCurrentView,
    views
  } = useRichTextView();
  if (!views || Object.keys(views).length === 0) {
    return null;
  }
  let t0;
  let t1;
  if ($[0] !== currentView || $[1] !== setCurrentView || $[2] !== views) {
    t1 = Symbol.for("react.early_return_sentinel");
    bb0: {
      const viewKeys = Object.keys(views);
      const hasNonDefaultViews = viewKeys.some(_temp);
      if (!hasNonDefaultViews) {
        t1 = null;
        break bb0;
      }
      const allViews = ["default", ...viewKeys.filter(_temp2)];
      const currentViewLabel = currentView.charAt(0).toUpperCase() + currentView.slice(1);
      t0 = _jsx("div", {
        className: "lexical-view-selector",
        children: _jsx(Popup, {
          button: _jsxs("button", {
            className: "lexical-view-selector__button",
            type: "button",
            children: [_jsx("span", {
              className: "lexical-view-selector__label",
              children: currentViewLabel
            }), _jsx(ChevronIcon, {
              className: "lexical-view-selector__icon"
            })]
          }),
          buttonType: "custom",
          horizontalAlign: "left",
          render: t2 => {
            const {
              close
            } = t2;
            return _jsx(PopupList.ButtonGroup, {
              children: allViews.map(viewName => {
                const viewLabel = viewName.charAt(0).toUpperCase() + viewName.slice(1);
                return _jsx(PopupList.Button, {
                  active: viewName === currentView,
                  disabled: viewName === currentView,
                  onClick: () => {
                    setCurrentView?.(viewName);
                    close();
                  },
                  children: viewLabel
                }, viewName);
              })
            });
          },
          size: "large"
        })
      });
    }
    $[0] = currentView;
    $[1] = setCurrentView;
    $[2] = views;
    $[3] = t0;
    $[4] = t1;
  } else {
    t0 = $[3];
    t1 = $[4];
  }
  if (t1 !== Symbol.for("react.early_return_sentinel")) {
    return t1;
  }
  return t0;
}
function _temp2(key_0) {
  return key_0 !== "default";
}
function _temp(key) {
  return key !== "default";
}
//# sourceMappingURL=ViewSelector.js.map