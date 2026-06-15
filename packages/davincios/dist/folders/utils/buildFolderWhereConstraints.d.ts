import type { SanitizedCollectionConfig } from '../../collections/config/types.js';
import type { DaVinciOSRequest, Where } from '../../types/index.js';
type Args = {
    collectionConfig: SanitizedCollectionConfig;
    folderID?: number | string;
    localeCode?: string;
    req: DaVinciOSRequest;
    search?: string;
    sort?: string;
};
export declare function buildFolderWhereConstraints({ collectionConfig, folderID, localeCode, req, search, sort, }: Args): Promise<undefined | Where>;
export {};
//# sourceMappingURL=buildFolderWhereConstraints.d.ts.map
