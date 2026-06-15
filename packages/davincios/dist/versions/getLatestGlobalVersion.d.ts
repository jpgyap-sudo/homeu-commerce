import type { SanitizedGlobalConfig } from '../globals/config/types.js';
import type { Document, DaVinciOS, DaVinciOSRequest, Where } from '../types/index.js';
type Args = {
    config: SanitizedGlobalConfig;
    locale?: string;
    DaVinciOS: DaVinciOS;
    published?: boolean;
    req?: DaVinciOSRequest;
    slug: string;
    where: Where;
};
export declare const getLatestGlobalVersion: ({ slug, config, locale, DaVinciOS, published, req, where, }: Args) => Promise<{
    global: Document;
    globalExists: boolean;
}>;
export {};
//# sourceMappingURL=getLatestGlobalVersion.d.ts.map
