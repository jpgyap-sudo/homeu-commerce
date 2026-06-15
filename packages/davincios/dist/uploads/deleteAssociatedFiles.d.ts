import type { SanitizedCollectionConfig } from '../collections/config/types.js';
import type { SanitizedConfig } from '../config/types.js';
import type { DaVinciOSRequest } from '../types/index.js';
import type { FileToSave } from './types.js';
type Args = {
    collectionConfig: SanitizedCollectionConfig;
    config: SanitizedConfig;
    doc: Record<string, unknown>;
    files?: FileToSave[];
    overrideDelete: boolean;
    req: DaVinciOSRequest;
};
export declare const deleteAssociatedFiles: (args: Args) => Promise<void>;
export {};
//# sourceMappingURL=deleteAssociatedFiles.d.ts.map
