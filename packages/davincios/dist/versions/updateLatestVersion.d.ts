import type { SanitizedCollectionConfig } from '../collections/config/types.js';
import type { SanitizedGlobalConfig } from '../globals/config/types.js';
import type { DaVinciOS } from '../index.js';
import type { JsonObject, DaVinciOSRequest } from '../types/index.js';
type Args<TData extends JsonObject> = {
    collection?: SanitizedCollectionConfig;
    global?: SanitizedGlobalConfig;
    id?: number | string;
    now: string;
    DaVinciOS: DaVinciOS;
    req?: DaVinciOSRequest;
    shouldUpdate?: (latestVersion: JsonObject) => boolean;
    versionData: TData;
};
/**
 * Finds the latest version and updates it in place if `shouldUpdate` returns true.
 * Used by both the unpublish and autosave paths in `saveVersion` to avoid creating
 * a redundant new version.
 *
 * Returns the updated version result, or `undefined` if no update was performed.
 */
export declare function updateLatestVersion<TData extends JsonObject>({ id, collection, global, now, DaVinciOS, req, shouldUpdate, versionData, }: Args<TData>): Promise<JsonObject | undefined>;
export {};
//# sourceMappingURL=updateLatestVersion.d.ts.map
