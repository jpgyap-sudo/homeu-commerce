import type { SanitizedCollectionConfig } from '../../../collections/config/types.js';
import { type DaVinciOS, type TypedUser } from '../../../index.js';
type Args = {
    collection: SanitizedCollectionConfig;
    DaVinciOS: DaVinciOS;
    user: TypedUser;
};
export declare const incrementLoginAttempts: ({ collection, DaVinciOS, user, }: Args) => Promise<void>;
export {};
//# sourceMappingURL=incrementLoginAttempts.d.ts.map
