import type { SanitizedConfig } from '../config/types.js';
import type { DaVinciOSRequest } from '../types/index.js';
/**
 * Returns a trusted request origin
 */
export declare const getRequestOrigin: ({ config, req, }: {
    config: Pick<SanitizedConfig, "cors" | "csrf" | "serverURL">;
    req: Pick<DaVinciOSRequest, "headers" | "DaVinciOS" | "url">;
}) => string;
//# sourceMappingURL=getRequestOrigin.d.ts.map
