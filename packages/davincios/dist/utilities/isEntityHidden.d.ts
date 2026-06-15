import type { SanitizedCollectionConfig } from '../collections/config/types.js';
import type { SanitizedGlobalConfig } from '../globals/config/types.js';
import type { DaVinciOSRequest } from '../types/index.js';
export declare const isEntityHidden: ({ hidden, user, }: {
    hidden: SanitizedCollectionConfig["admin"]["hidden"] | SanitizedGlobalConfig["admin"]["hidden"];
    user: DaVinciOSRequest["user"];
}) => boolean;
//# sourceMappingURL=isEntityHidden.d.ts.map
