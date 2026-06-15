import type { I18n } from '@payloadcms/translations';
import type { Column, PaginatedDocs, SanitizedCollectionConfig, SanitizedGlobalConfig, TypeWithVersion } from 'payload';
import React from 'react';
import { type CreatedAtCellProps } from './cells/CreatedAt/index.js';
export declare const buildVersionColumns: ({ collectionConfig, CreatedAtCellOverride, currentlyPublishedVersion, docID, docs, globalConfig, i18n: { t }, isTrashed, latestDraftVersion, }: {
    collectionConfig?: SanitizedCollectionConfig;
    CreatedAtCellOverride?: React.ComponentType<CreatedAtCellProps>;
    currentlyPublishedVersion?: TypeWithVersion<any>;
    docID?: number | string;
    docs: PaginatedDocs<TypeWithVersion<any>>["docs"];
    globalConfig?: SanitizedGlobalConfig;
    i18n: I18n;
    isTrashed?: boolean;
    latestDraftVersion?: TypeWithVersion<any>;
}) => Column[];
//# sourceMappingURL=buildColumns.d.ts.map