import type { SanitizedConfig } from '../config/types.js';
import type { DaVinciOSRequest } from '../types/index.js';
type Args = {
    canSetHeaders?: boolean;
    config: Promise<SanitizedConfig> | SanitizedConfig;
    params?: {
        collection: string;
    };
    DaVinciOSInstanceCacheKey?: string;
    request: Request;
};
export declare const createDaVinciOSRequest: ({ canSetHeaders, config: configPromise, params, DaVinciOSInstanceCacheKey, request, }: Args) => Promise<DaVinciOSRequest>;
export {};
//# sourceMappingURL=createDaVinciOSRequest.d.ts.map
