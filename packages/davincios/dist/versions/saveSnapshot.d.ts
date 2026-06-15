import type { SanitizedCollectionConfig } from '../collections/config/types.js';
import type { SanitizedGlobalConfig } from '../globals/config/types.js';
import type { DaVinciOS, TypeWithVersion } from '../index.js';
import type { JsonObject, DaVinciOSRequest, SelectType } from '../types/index.js';
type Args<T extends JsonObject = JsonObject> = {
    autosave?: boolean;
    collection?: SanitizedCollectionConfig;
    data?: T;
    global?: SanitizedGlobalConfig;
    id?: number | string;
    DaVinciOS: DaVinciOS;
    publishSpecificLocale?: string;
    req?: DaVinciOSRequest;
    select?: SelectType;
};
export declare const saveSnapshot: <T extends JsonObject = JsonObject>({ id, autosave, collection, data, global, DaVinciOS, publishSpecificLocale, req, select, }: Args<T>) => Promise<Omit<TypeWithVersion<T>, "parent"> | TypeWithVersion<T> | undefined>;
export {};
//# sourceMappingURL=saveSnapshot.d.ts.map
