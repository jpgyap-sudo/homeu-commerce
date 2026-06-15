'use client';

import { c as _c } from "react/compiler-runtime";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { EditIcon, useConfig, useModal, useTranslation } from '@davincios/ui';
import React, { useId } from 'react';
import { WidgetConfigDrawer } from './WidgetConfigDrawer.js';
const getWidgetSlugFromID = widgetID => widgetID.slice(0, widgetID.lastIndexOf('-'));
export function WidgetEditControl(t0) {
  const $ = _c(7);
  const {
    onSave,
    widgetData,
    widgetID
  } = t0;
  const {
    t
  } = useTranslation();
  const {
    openModal
  } = useModal();
  const {
    widgets: t1
  } = useConfig().config.admin.dashboard ?? {};
  const configWidgets = t1 === undefined ? [] : t1;
  let t2;
  if ($[0] !== widgetID) {
    t2 = getWidgetSlugFromID(widgetID);
    $[0] = widgetID;
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  const widgetSlug = t2;
  let t3;
  if ($[2] !== widgetSlug) {
    t3 = widget => widget.slug === widgetSlug;
    $[2] = widgetSlug;
    $[3] = t3;
  } else {
    t3 = $[3];
  }
  const widgetConfig = configWidgets.find(t3);
  const hasEditableFields = Boolean(widgetConfig?.fields?.length);
  const drawerID = useId();
  const drawerSlug = `widget-editor-${drawerID}`;
  if (!hasEditableFields) {
    return null;
  }
  let t4;
  if ($[4] !== drawerSlug || $[5] !== openModal) {
    t4 = () => {
      openModal(drawerSlug);
    };
    $[4] = drawerSlug;
    $[5] = openModal;
    $[6] = t4;
  } else {
    t4 = $[6];
  }
  return _jsxs(_Fragment, {
    children: [_jsxs("button", {
      className: "widget-wrapper__edit-btn",
      onClick: t4,
      type: "button",
      children: [_jsxs("span", {
        className: "sr-only",
        children: [t("general:edit"), " ", widgetID]
      }), _jsx(EditIcon, {})]
    }), _jsx(WidgetConfigDrawer, {
      drawerSlug,
      onSave,
      widget: widgetConfig,
      widgetData
    })]
  });
}
//# sourceMappingURL=WidgetEditControl.js.map