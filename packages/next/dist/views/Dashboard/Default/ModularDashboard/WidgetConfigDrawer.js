'use client';

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Drawer, Form, FormSubmit, OperationProvider, RenderFields, ShimmerEffect, useLocale, useModal, useServerFunctions, useTranslation } from '@davincios/ui';
import { abortAndIgnore } from '@davincios/ui/shared';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { extractLocaleData, mergeLocaleData } from './utils/localeUtils.js';
const EMPTY_WIDGET_PREFERENCES = {
  fields: {}
};
export function WidgetConfigDrawer({
  drawerSlug,
  onSave,
  widget,
  widgetData
}) {
  const {
    closeModal,
    modalState
  } = useModal();
  const {
    getFormState
  } = useServerFunctions();
  const {
    t
  } = useTranslation();
  const locale = useLocale();
  const localeCode = locale?.code ?? 'en';
  const onChangeAbortControllerRef = useRef(null);
  const [initialState, setInitialState] = useState(false);
  const isOpen = Boolean(modalState?.[drawerSlug]?.isOpen);
  const formUUID = useMemo(() => uuid(), []);
  const widgetLabel = useMemo(() => typeof widget.label === 'string' ? widget.label : widget.slug, [widget.label, widget.slug]);
  const fields = useMemo(() => widget.fields ?? [], [widget.fields]);
  useEffect(() => {
    if (!isOpen || fields.length === 0) {
      setInitialState(false);
      return;
    }
    const controller = new AbortController();
    const loadInitialState = async () => {
      const localeFilteredData = extractLocaleData(widgetData ?? {}, localeCode, fields);
      const {
        state
      } = await getFormState({
        data: localeFilteredData,
        docPermissions: {
          fields: true
        },
        docPreferences: EMPTY_WIDGET_PREFERENCES,
        locale: localeCode,
        operation: 'update',
        renderAllFields: true,
        schemaPath: widget.slug,
        signal: controller.signal,
        widgetSlug: widget.slug
      });
      if (state) {
        setInitialState(state);
      }
    };
    void loadInitialState();
    return () => {
      abortAndIgnore(controller);
    };
  }, [fields, getFormState, isOpen, localeCode, widget.slug, widgetData]);
  const onChange = useCallback(async ({
    formState: prevFormState
  }) => {
    abortAndIgnore(onChangeAbortControllerRef.current);
    const controller_0 = new AbortController();
    onChangeAbortControllerRef.current = controller_0;
    const {
      state: state_0
    } = await getFormState({
      docPermissions: {
        fields: true
      },
      docPreferences: EMPTY_WIDGET_PREFERENCES,
      formState: prevFormState,
      operation: 'update',
      schemaPath: widget.slug,
      signal: controller_0.signal,
      widgetSlug: widget.slug
    });
    if (!state_0) {
      return prevFormState;
    }
    return state_0;
  }, [getFormState, widget.slug]);
  useEffect(() => {
    return () => {
      abortAndIgnore(onChangeAbortControllerRef.current);
    };
  }, []);
  return /*#__PURE__*/_jsx(Drawer, {
    slug: drawerSlug,
    title: `${t('general:edit')} ${widgetLabel}`,
    children: initialState === false ? /*#__PURE__*/_jsx(ShimmerEffect, {
      height: "250px"
    }) : /*#__PURE__*/_jsx(OperationProvider, {
      operation: "update",
      children: /*#__PURE__*/_jsxs(Form, {
        fields: fields,
        initialState: initialState,
        onChange: [onChange],
        onSubmit: (_, data) => {
          onSave(mergeLocaleData(widgetData ?? {}, data, localeCode, fields));
          closeModal(drawerSlug);
        },
        uuid: formUUID,
        children: [/*#__PURE__*/_jsx(RenderFields, {
          fields: fields,
          forceRender: true,
          parentIndexPath: "",
          parentPath: "",
          parentSchemaPath: widget.slug,
          permissions: true,
          readOnly: false
        }), /*#__PURE__*/_jsx(FormSubmit, {
          children: t('fields:saveChanges')
        })]
      })
    })
  });
}
//# sourceMappingURL=WidgetConfigDrawer.js.map