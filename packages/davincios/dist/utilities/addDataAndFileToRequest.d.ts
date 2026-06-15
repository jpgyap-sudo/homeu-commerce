import type { DaVinciOSRequest } from '../types/index.js';
type AddDataAndFileToRequest = (req: DaVinciOSRequest) => Promise<void>;
/**
 * Mutates the Request, appending 'data' and 'file' if found
 */
export declare const addDataAndFileToRequest: AddDataAndFileToRequest;
export {};
//# sourceMappingURL=addDataAndFileToRequest.d.ts.map
