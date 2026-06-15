import type { TFunction } from '@payloadcms/translations';
import type { Pill } from '@payloadcms/ui';
type Args = {
    currentLocale?: string;
    currentlyPublishedVersion?: {
        id: number | string;
        publishedLocale?: string;
        updatedAt: string;
        version: {
            updatedAt: string;
        };
    };
    latestDraftVersion?: {
        id: number | string;
        updatedAt: string;
    };
    t: TFunction;
    version: {
        id: number | string;
        publishedLocale?: string;
        version: {
            _status?: 'draft' | 'published';
            updatedAt: string;
        };
    };
};
/**
 * Gets the appropriate version label and version pill styling
 * given existing versions and the current version status.
 */
export declare function getVersionLabel({ currentLocale, currentlyPublishedVersion, latestDraftVersion, t, version, }: Args): {
    label: string;
    name: 'currentDraft' | 'currentlyPublished' | 'draft' | 'previouslyPublished' | 'published';
    pillStyle: Parameters<typeof Pill>[0]['pillStyle'];
};
export {};
//# sourceMappingURL=getVersionLabel.d.ts.map