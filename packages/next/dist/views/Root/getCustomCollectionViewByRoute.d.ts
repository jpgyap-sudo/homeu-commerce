import type { SanitizedCollectionConfig } from 'payload';
import type { ViewFromConfig } from './getRouteData.js';
export declare const getCustomCollectionViewByRoute: ({ adminRoute, baseRoute, currentRoute: currentRouteWithAdmin, views, }: {
    adminRoute: string;
    baseRoute: string;
    currentRoute: string;
    views: SanitizedCollectionConfig["admin"]["components"]["views"];
}) => {
    view: ViewFromConfig;
    viewKey: null | string;
};
//# sourceMappingURL=getCustomCollectionViewByRoute.d.ts.map