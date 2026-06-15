'use client';

import { c as _c } from "react/compiler-runtime";
import { jsx as _jsx } from "react/jsx-runtime";
import React, { useMemo } from 'react';
const baseClass = 'toolbar-popup__dropdown';
import { useTranslation } from '@davincios/ui';
import { useEditorConfigContext } from '../../../../lexical/config/client/EditorConfigProvider.js';
import { DropDown, DropDownItem } from './DropDown.js';
const ToolbarItem = t0 => {
  const $ = _c(14);
  const {
    active,
    anchorElem,
    editor,
    enabled,
    item
  } = t0;
  const {
    i18n
  } = useTranslation();
  const {
    fieldProps: t1
  } = useEditorConfigContext();
  const {
    featureClientSchemaMap,
    schemaPath
  } = t1;
  if (item.Component) {
    let t2;
    if ($[0] !== active || $[1] !== anchorElem || $[2] !== editor || $[3] !== enabled || $[4] !== item) {
      t2 = item?.Component && _jsx(item.Component, {
        active,
        anchorElem,
        editor,
        enabled,
        item
      }, item.key);
      $[0] = active;
      $[1] = anchorElem;
      $[2] = editor;
      $[3] = enabled;
      $[4] = item;
      $[5] = t2;
    } else {
      t2 = $[5];
    }
    return t2;
  }
  let t2;
  if ($[6] !== active || $[7] !== editor || $[8] !== enabled || $[9] !== featureClientSchemaMap || $[10] !== i18n || $[11] !== item || $[12] !== schemaPath) {
    let title = item.key;
    let croppedTitle;
    if (item.label) {
      title = typeof item.label === "function" ? item.label({
        featureClientSchemaMap,
        i18n,
        schemaPath
      }) : item.label;
    }
    if (title.length > 25) {
      croppedTitle = title.substring(0, 25) + "...";
    } else {
      croppedTitle = title;
    }
    t2 = _jsx(DropDownItem, {
      active,
      editor,
      enabled,
      Icon: item?.ChildComponent ? _jsx(item.ChildComponent, {}) : undefined,
      item,
      itemKey: item.key,
      tooltip: title,
      children: _jsx("span", {
        className: "text",
        children: croppedTitle
      })
    }, item.key);
    $[6] = active;
    $[7] = editor;
    $[8] = enabled;
    $[9] = featureClientSchemaMap;
    $[10] = i18n;
    $[11] = item;
    $[12] = schemaPath;
    $[13] = t2;
  } else {
    t2 = $[13];
  }
  return t2;
};
const MemoToolbarItem = /*#__PURE__*/React.memo(ToolbarItem);
export const ToolbarDropdown = ({
  anchorElem,
  classNames,
  editor,
  group,
  groupState,
  Icon,
  itemsContainerClassNames,
  label
}) => {
  const {
    items,
    key: groupKey
  } = group;
  const renderedItems = useMemo(() => {
    return items?.length ? items.map(item => /*#__PURE__*/_jsx(MemoToolbarItem, {
      active: groupState.activeItemKeys.includes(item.key),
      anchorElem: anchorElem,
      editor: editor,
      enabled: groupState.enabledItemKeys.includes(item.key),
      item: item
    }, item.key)) : null;
  }, [items, groupState.activeItemKeys, groupState.enabledItemKeys, anchorElem, editor]);
  return /*#__PURE__*/_jsx(DropDown, {
    buttonAriaLabel: `${groupKey} dropdown`,
    buttonClassName: [baseClass, `${baseClass}-${groupKey}`, ...(classNames || [])].filter(Boolean).join(' '),
    disabled: !groupState.enabledGroup,
    dropdownKey: groupKey,
    Icon: Icon,
    itemsContainerClassNames: [`${baseClass}-items`, ...(itemsContainerClassNames || [])],
    label: label,
    children: renderedItems
  }, groupKey);
};
//# sourceMappingURL=index.js.map