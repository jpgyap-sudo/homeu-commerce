import type { ClientWidget } from 'payload';
import React from 'react';
type WidgetConfigDrawerProps = {
    drawerSlug: string;
    onSave: (data: Record<string, unknown>) => void;
    widget: ClientWidget;
    widgetData?: Record<string, unknown>;
};
export declare function WidgetConfigDrawer({ drawerSlug, onSave, widget, widgetData, }: WidgetConfigDrawerProps): React.JSX.Element;
export {};
//# sourceMappingURL=WidgetConfigDrawer.d.ts.map