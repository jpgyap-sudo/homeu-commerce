import type { DashboardConfig, PayloadRequest, Widget } from 'payload';
import type { WidgetItem } from '../index.client.js';
export declare function getItemsFromConfig(defaultLayout: NonNullable<DashboardConfig['defaultLayout']>, req: PayloadRequest, widgets: Pick<Widget, 'maxWidth' | 'minWidth' | 'slug'>[]): Promise<WidgetItem[]>;
//# sourceMappingURL=getItemsFromConfig.d.ts.map