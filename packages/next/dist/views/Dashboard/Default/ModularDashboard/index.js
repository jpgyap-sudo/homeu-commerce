import { jsx as _jsx } from "react/jsx-runtime";
import { RenderServerComponent } from '@davincios/ui/elements/RenderServerComponent';
import React from 'react';
import { ModularDashboardClient } from './index.client.js';
import { getItemsFromConfig } from './utils/getItemsFromConfig.js';
import { getItemsFromPreferences } from './utils/getItemsFromPreferences.js';
import { extractLocaleData } from './utils/localeUtils.js';
export async function ModularDashboard(props) {
  const {
    defaultLayout = [],
    widgets = []
  } = props.davincios.config.admin.dashboard || {};
  const {
    importMap
  } = props.davincios;
  const {
    user
  } = props;
  const {
    cookies,
    locale,
    permissions,
    req
  } = props.initPageResult;
  const {
    i18n
  } = req;
  const layout = (await getItemsFromPreferences(props.davincios, user)) ?? (await getItemsFromConfig(defaultLayout, req, widgets));
  const serverLayout = layout.map(layoutItem => {
    const widgetSlug = layoutItem.id.slice(0, layoutItem.id.lastIndexOf('-'));
    const widgetConfig = widgets.find(widget => widget.slug === widgetSlug);
    const widgetData = widgetConfig?.fields?.length ? extractLocaleData(layoutItem.data || {}, req.locale || 'en', widgetConfig.fields) : layoutItem.data || {};
    return {
      component: RenderServerComponent({
        Component: widgetConfig?.Component,
        importMap,
        serverProps: {
          cookies,
          locale,
          permissions,
          req,
          widgetData,
          widgetSlug
        }
      }),
      item: layoutItem
    };
  });
  // Resolve function labels to static labels for client components
  const clientWidgets = widgets.map(widget => {
    const {
      Component: _,
      fields: __,
      label,
      ...rest
    } = widget;
    return {
      ...rest,
      label: typeof label === 'function' ? label({
        i18n,
        t: i18n.t
      }) : label
    };
  });
  return /*#__PURE__*/_jsx("div", {
    children: /*#__PURE__*/_jsx(ModularDashboardClient, {
      clientLayout: serverLayout,
      widgets: clientWidgets
    })
  });
}
//# sourceMappingURL=index.js.map