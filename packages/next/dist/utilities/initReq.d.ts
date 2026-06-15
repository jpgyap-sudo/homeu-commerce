import type { ImportMap, InitReqResult, SanitizedConfig } from 'payload';
import { createLocalReq } from 'payload';
/**
 * Initializes a full request object, including the `req` object and access control.
 * As access control and getting the request locale is dependent on the current URL and
 */
export declare const initReq: ({ canSetHeaders, configPromise, importMap, key, overrides, }: {
    canSetHeaders?: boolean;
    configPromise: Promise<SanitizedConfig> | SanitizedConfig;
    importMap: ImportMap;
    key: string;
    overrides?: Parameters<typeof createLocalReq>[0];
}) => Promise<InitReqResult>;
//# sourceMappingURL=initReq.d.ts.map