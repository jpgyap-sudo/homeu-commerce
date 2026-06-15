import type { SanitizedConfig } from '../config/types.js';
import type { TypedFallbackLocale } from '../index.js';
import type { DaVinciOSRequest } from '../types/index.js';
/**
 * Mutates the Request to contain 'locale' and 'fallbackLocale' based on data or searchParams
 */
export declare function addLocalesToRequestFromData(req: DaVinciOSRequest): void;
type SanitizeLocalesArgs = {
    fallbackLocale: TypedFallbackLocale;
    locale: string;
    localization: SanitizedConfig['localization'];
};
type SanitizeLocalesReturn = {
    fallbackLocale?: TypedFallbackLocale;
    locale?: string;
};
export declare const sanitizeLocales: ({ fallbackLocale, locale, localization, }: SanitizeLocalesArgs) => SanitizeLocalesReturn;
export {};
//# sourceMappingURL=addLocalesToRequest.d.ts.map
