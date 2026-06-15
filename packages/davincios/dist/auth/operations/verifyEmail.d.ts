import type { Collection } from '../../collections/config/types.js';
import type { DaVinciOSRequest } from '../../types/index.js';
export type Args = {
    collection: Collection;
    req: DaVinciOSRequest;
    token: string;
};
export declare const verifyEmailOperation: (args: Args) => Promise<boolean>;
//# sourceMappingURL=verifyEmail.d.ts.map
