import type { AuthCollectionSlug, AuthOperationsFromCollectionSlug, DaVinciOS, RequestContext } from '../../../index.js';
import type { DaVinciOSRequest } from '../../../types/index.js';
import type { LoginResult } from '../login.js';
export type Options<TSlug extends AuthCollectionSlug> = {
    collection: TSlug;
    context?: RequestContext;
    data: AuthOperationsFromCollectionSlug<TSlug>['login'];
    depth?: number;
    fallbackLocale?: string;
    locale?: string;
    overrideAccess?: boolean;
    req?: Partial<DaVinciOSRequest>;
    showHiddenFields?: boolean;
    trash?: boolean;
};
export declare function loginLocal<TSlug extends AuthCollectionSlug>(DaVinciOS: DaVinciOS, options: Options<TSlug>): Promise<LoginResult<TSlug>>;
//# sourceMappingURL=login.d.ts.map
