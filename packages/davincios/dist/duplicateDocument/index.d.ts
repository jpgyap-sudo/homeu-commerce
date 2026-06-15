import type { SanitizedCollectionConfig } from '../collections/config/types.js';
import type { JsonObject, DaVinciOSRequest } from '../types/index.js';
type GetDuplicateDocumentArgs = {
    collectionConfig: SanitizedCollectionConfig;
    draftArg?: boolean;
    id: number | string;
    overrideAccess?: boolean;
    req: DaVinciOSRequest;
    selectedLocales?: string[];
};
export declare const getDuplicateDocumentData: ({ id, collectionConfig, draftArg, overrideAccess, req, selectedLocales, }: GetDuplicateDocumentArgs) => Promise<{
    duplicatedFromDoc: JsonObject;
    duplicatedFromDocWithLocales: JsonObject;
}>;
export {};
//# sourceMappingURL=index.d.ts.map
