import type { AuthCollectionSlug, DaVinciOS, RequestContext } from '../../../index.js';
import type { DaVinciOSRequest } from '../../../types/index.js';
import type { Result } from '../forgotPassword.js';
export type Options<TSlug extends AuthCollectionSlug> = {
    collection: TSlug;
    context?: RequestContext;
    data: {
        email: string;
    };
    disableEmail?: boolean;
    expiration?: number;
    overrideAccess?: boolean;
    req?: Partial<DaVinciOSRequest>;
};
export declare function forgotPasswordLocal<T extends AuthCollectionSlug>(DaVinciOS: DaVinciOS, options: Options<T>): Promise<Result>;
//# sourceMappingURL=forgotPassword.d.ts.map
