'use client';

import { c as _c } from "react/compiler-runtime";
import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { ShimmerEffect, useServerFunctions } from '@davincios/ui';
import React, { useCallback, useEffect, useRef } from 'react';
/**
 * Utility to render a widget on-demand on the client.
 */
export const RenderWidget = t0 => {
  const $ = _c(10);
  const {
    widgetData,
    widgetId
  } = t0;
  const [Component, setComponent] = React.useState(null);
  const {
    serverFunction
  } = useServerFunctions();
  const requestIDRef = useRef(0);
  let t1;
  if ($[0] !== serverFunction || $[1] !== widgetData || $[2] !== widgetId) {
    t1 = () => {
      const render = async function render() {
        const requestID = requestIDRef.current = requestIDRef.current + 1;
        setComponent(null);
        ;
        try {
          const widgetSlug = widgetId.slice(0, widgetId.lastIndexOf("-"));
          const result = await serverFunction({
            name: "render-widget",
            args: {
              widgetData,
              widgetSlug
            }
          });
          if (requestID !== requestIDRef.current) {
            return;
          }
          setComponent(result.component);
        } catch (t2) {
          if (requestID !== requestIDRef.current) {
            return;
          }
          setComponent(React.createElement("div", {
            style: {
              background: "var(--theme-error-50)",
              border: "1px solid var(--theme-error-200)",
              borderRadius: "4px",
              color: "var(--theme-error-text)",
              padding: "20px",
              textAlign: "center"
            }
          }, "Failed to load widget. Please try again later."));
        }
      };
      render();
    };
    $[0] = serverFunction;
    $[1] = widgetData;
    $[2] = widgetId;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  const renderWidget = t1;
  let t2;
  let t3;
  if ($[4] !== renderWidget) {
    t2 = () => {
      renderWidget();
    };
    t3 = [renderWidget];
    $[4] = renderWidget;
    $[5] = t2;
    $[6] = t3;
  } else {
    t2 = $[5];
    t3 = $[6];
  }
  useEffect(t2, t3);
  if (!Component) {
    let t4;
    if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
      t4 = _jsx(ShimmerEffect, {
        height: "100%"
      });
      $[7] = t4;
    } else {
      t4 = $[7];
    }
    return t4;
  }
  let t4;
  if ($[8] !== Component) {
    t4 = _jsx(_Fragment, {
      children: Component
    });
    $[8] = Component;
    $[9] = t4;
  } else {
    t4 = $[9];
  }
  return t4;
};
//# sourceMappingURL=RenderWidget.js.map