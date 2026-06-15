import type { DaVinciOSRequest } from '../types/index.js';
import type { SanitizedPermissions } from './types.js';
type GetAccessResultsArgs = {
    req: DaVinciOSRequest;
};
export declare function getAccessResults({ req, }: GetAccessResultsArgs): Promise<SanitizedPermissions>;
export {};
//# sourceMappingURL=getAccessResults.d.ts.map
