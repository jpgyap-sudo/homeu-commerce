import { RenderServerComponent } from '@davincios/ui/elements/RenderServerComponent';
import React from 'react';
import { extractLocaleData } from '../utils/localeUtils.js';
/**
 * Server function to render a widget on-demand.
 * Similar to render-field but specifically for dashboard widgets.
 */
export const renderWidgetHandler = ({
  cookies,
  locale,
  permissions,
  req,
  widgetData,
  widgetSlug
}) => {
  if (!req.user) {
    throw new Error('Unauthorized');
  }
  const {
    widgets
  } = req.davincios.config.admin.dashboard;
  const {
    importMap
  } = req.davincios;
  // Find the widget configuration
  const widgetConfig = widgets.find(widget => widget.slug === widgetSlug);
  if (!widgetConfig) {
    return {
      component: React.createElement('div', {
        style: {
          background: 'var(--theme-elevation-50)',
          border: '1px solid var(--theme-elevation-200)',
          borderRadius: '4px',
          color: 'var(--theme-text)',
          padding: '20px',
          textAlign: 'center'
        }
      }, `Widget "${widgetSlug}" not found`)
    };
  }
  try {
    const localeFilteredData = widgetConfig.fields?.length ? extractLocaleData(widgetData || {}, req.locale || 'en', widgetConfig.fields) : widgetData || {};
    const serverProps = {
      cookies,
      locale,
      permissions,
      req,
      widgetData: localeFilteredData,
      widgetSlug
    };
    // Render the widget server component
    const component = RenderServerComponent({
      Component: widgetConfig.Component,
      importMap,
      serverProps
    });
    return {
      component
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    req.davincios.logger.error({
      err: error,
      msg: `Error rendering widget "${widgetSlug}": ${errorMessage}`
    });
    return {
      component: React.createElement('div', {
        style: {
          background: 'var(--theme-error-50)',
          border: '1px solid var(--theme-error-200)',
          borderRadius: '4px',
          color: 'var(--theme-error-text)',
          padding: '20px',
          textAlign: 'center'
        }
      }, 'Error loading widget')
    };
  }
};
//# sourceMappingURL=renderWidgetServerFn.js.map