import type { Access, AccessResult } from '../config/types.js';
import type { DaVinciOSRequest } from '../types/index.js';
type OperationArgs = {
    data?: any;
    disableErrors?: boolean;
    id?: number | string;
    isReadingStaticFile?: boolean;
    req: DaVinciOSRequest;
};
export declare const executeAccess: ({ id, data, disableErrors, isReadingStaticFile, req }: OperationArgs, access: Access) => Promise<AccessResult>;
export {};
//# sourceMappingURL=executeAccess.d.ts.map
