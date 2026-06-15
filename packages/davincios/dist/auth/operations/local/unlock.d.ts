import type { AuthCollectionSlug, AuthOperationsFromCollectionSlug, DaVinciOS, RequestContext } from '../../../index.js';
import type { DaVinciOSRequest } from '../../../types/index.js';
export type Options<TSlug extends AuthCollectionSlug> = {
    collection: TSlug;
    context?: RequestContext;
    data: AuthOperationsFromCollectionSlug<TSlug>['unlock'];
    overrideAccess: boolean;
    req?: Partial<DaVinciOSRequest>;
};
export declare function unlockLocal<TSlug extends AuthCollectionSlug>(DaVinciOS: DaVinciOS, options: Options<TSlug>): Promise<boolean>;
//# sourceMappingURL=unlock.d.ts.map
