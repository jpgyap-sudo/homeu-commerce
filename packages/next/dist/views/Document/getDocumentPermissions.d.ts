import type { Data, PayloadRequest, SanitizedCollectionConfig, SanitizedDocumentPermissions, SanitizedGlobalConfig } from 'payload';
export declare const getDocumentPermissions: (args: {
    collectionConfig?: SanitizedCollectionConfig;
    data: Data;
    globalConfig?: SanitizedGlobalConfig;
    /**
     * When called for creating a new document, id is not provided.
     */
    id?: number | string;
    req: PayloadRequest;
}) => Promise<{
    docPermissions: SanitizedDocumentPermissions;
    hasDeletePermission: boolean;
    hasPublishPermission: boolean;
    hasSavePermission: boolean;
    hasTrashPermission: boolean;
}>;
//# sourceMappingURL=getDocumentPermissions.d.ts.map