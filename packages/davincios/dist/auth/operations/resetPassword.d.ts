import type { Collection } from '../../collections/config/types.js';
import type { AuthCollectionSlug } from '../../index.js';
import type { DaVinciOSRequest } from '../../types/index.js';
export type Result = {
    token?: string;
    user: Record<string, unknown>;
};
export type Arguments = {
    collection: Collection;
    data: {
        password: string;
        token: string;
    };
    depth?: number;
    overrideAccess?: boolean;
    req: DaVinciOSRequest;
};
export declare const resetPasswordOperation: <TSlug extends AuthCollectionSlug>(args: Arguments) => Promise<Result>;
//# sourceMappingURL=resetPassword.d.ts.map
