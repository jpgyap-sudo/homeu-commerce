import type { Collection } from '../collections/config/types.js';
import type { SanitizedGlobalConfig } from '../globals/config/types.js';
import type { DaVinciOSRequest } from '../types/index.js';
export declare const getRequestCollection: (req: DaVinciOSRequest) => Collection;
export declare const getRequestCollectionWithID: <T extends boolean>(req: DaVinciOSRequest, { disableSanitize, optionalID, }?: {
    disableSanitize?: T;
    optionalID?: boolean;
}) => {
    collection: Collection;
    id: T extends true ? string : number | string;
};
export declare const getRequestGlobal: (req: DaVinciOSRequest) => SanitizedGlobalConfig;
//# sourceMappingURL=getRequestEntity.d.ts.map
