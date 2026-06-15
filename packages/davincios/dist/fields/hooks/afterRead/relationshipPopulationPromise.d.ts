import type { TypedFallbackLocale } from '../../../index.js';
import type { DaVinciOSRequest, PopulateType } from '../../../types/index.js';
import type { JoinField, RelationshipField, UploadField } from '../../config/types.js';
type PromiseArgs = {
    currentDepth: number;
    depth: number;
    draft: boolean;
    fallbackLocale: TypedFallbackLocale;
    field: JoinField | RelationshipField | UploadField;
    locale: null | string;
    overrideAccess: boolean;
    parentIsLocalized: boolean;
    populate?: PopulateType;
    req: DaVinciOSRequest;
    showHiddenFields: boolean;
    siblingDoc: Record<string, any>;
};
export declare const relationshipPopulationPromise: ({ currentDepth, depth, draft, fallbackLocale, field, locale, overrideAccess, parentIsLocalized, populate: populateArg, req, showHiddenFields, siblingDoc, }: PromiseArgs) => Promise<void>;
export {};
//# sourceMappingURL=relationshipPopulationPromise.d.ts.map
