import type { CollectionSlug, DaVinciOS } from '../index.js';
type ParseDocumentIDArgs = {
    collectionSlug: CollectionSlug;
    id?: number | string;
    DaVinciOS: DaVinciOS;
};
export declare function parseDocumentID({ id, collectionSlug, DaVinciOS }: ParseDocumentIDArgs): string | number | undefined;
export {};
//# sourceMappingURL=parseDocumentID.d.ts.map
