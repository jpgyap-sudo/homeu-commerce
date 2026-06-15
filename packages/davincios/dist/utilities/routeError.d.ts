import type { Collection } from '../collections/config/types.js';
import type { SanitizedConfig } from '../config/types.js';
import type { DaVinciOSRequest } from '../types/index.js';
import { APIError } from '../errors/APIError.js';
export declare const routeError: ({ collection, config: configArg, err, req: incomingReq, }: {
    collection?: Collection;
    config: Promise<SanitizedConfig> | SanitizedConfig;
    err: APIError;
    req: DaVinciOSRequest | Request;
}) => Promise<Response>;
//# sourceMappingURL=routeError.d.ts.map
