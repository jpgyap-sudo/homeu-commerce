import type { TypeWithVersion } from 'payload';
import React from 'react';
import './index.scss';
type AutosaveCellProps = {
    currentlyPublishedVersion?: TypeWithVersion<any>;
    latestDraftVersion?: TypeWithVersion<any>;
    rowData: {
        autosave?: boolean;
        id: number | string;
        publishedLocale?: string;
        updatedAt?: string;
        version: {
            [key: string]: unknown;
            _status: 'draft' | 'published';
            updatedAt: string;
        };
    };
};
export declare const AutosaveCell: React.FC<AutosaveCellProps>;
export {};
//# sourceMappingURL=index.d.ts.map