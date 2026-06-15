import type { DaVinciOS, RequestContext, TypedLocale, TypedUser } from '../index.js';
import type { DaVinciOSRequest } from '../types/index.js';
export type CreateLocalReqOptions = {
    context?: RequestContext;
    depth?: number;
    fallbackLocale?: false | TypedLocale;
    locale?: string;
    req?: Partial<DaVinciOSRequest>;
    urlSuffix?: string;
    user?: TypedUser;
};
type CreateLocalReq = (options: CreateLocalReqOptions, DaVinciOS: DaVinciOS) => Promise<DaVinciOSRequest>;
export declare const createLocalReq: CreateLocalReq;
export {};
//# sourceMappingURL=createLocalReq.d.ts.map
