import type { DaVinciOSRequest } from '../types/index.js';
type CheckDocumentLockStatusArgs = {
    collectionSlug?: string;
    globalSlug?: string;
    id?: number | string;
    lockDurationDefault?: number;
    lockErrorMessage?: string;
    overrideLock?: boolean;
    req: DaVinciOSRequest;
};
export declare const checkDocumentLockStatus: ({ id, collectionSlug, globalSlug, lockDurationDefault, lockErrorMessage, overrideLock, req, }: CheckDocumentLockStatusArgs) => Promise<void>;
export {};
//# sourceMappingURL=checkDocumentLockStatus.d.ts.map
