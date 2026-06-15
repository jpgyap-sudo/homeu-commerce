import type { AuthCollectionSlug, DaVinciOS, RequestContext } from '../../../index.js';
import type { DaVinciOSRequest } from '../../../types/index.js';
import type { Result } from '../resetPassword.js';
export type Options<TSlug extends AuthCollectionSlug> = {
    collection: TSlug;
    context?: RequestContext;
    data: {
        password: string;
        token: string;
    };
    overrideAccess: boolean;
    req?: Partial<DaVinciOSRequest>;
};
export declare function resetPasswordLocal<TSlug extends AuthCollectionSlug>(DaVinciOS: DaVinciOS, options: Options<TSlug>): Promise<Result>;
//# sourceMappingURL=resetPassword.d.ts.map
