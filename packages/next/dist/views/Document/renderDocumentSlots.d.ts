import type { DocumentSlots, Locale, PayloadRequest, SanitizedCollectionConfig, SanitizedGlobalConfig, SanitizedPermissions, ServerFunction } from 'payload';
export declare const renderDocumentSlots: (args: {
    collectionConfig?: SanitizedCollectionConfig;
    globalConfig?: SanitizedGlobalConfig;
    hasSavePermission: boolean;
    id?: number | string;
    locale: Locale;
    permissions: SanitizedPermissions;
    req: PayloadRequest;
}) => DocumentSlots;
export declare const renderDocumentSlotsHandler: ServerFunction<{
    collectionSlug: string;
    id?: number | string;
}>;
//# sourceMappingURL=renderDocumentSlots.d.ts.map