import type { AuthCollectionSlug, DaVinciOS, RequestContext } from '../../../index.js';
import type { DaVinciOSRequest } from '../../../types/index.js';
export type Options<TSlug extends AuthCollectionSlug> = {
    collection: TSlug;
    context?: RequestContext;
    req?: Partial<DaVinciOSRequest>;
    token: string;
};
export declare function verifyEmailLocal<T extends AuthCollectionSlug>(DaVinciOS: DaVinciOS, options: Options<T>): Promise<boolean>;
//# sourceMappingURL=verifyEmail.d.ts.map
