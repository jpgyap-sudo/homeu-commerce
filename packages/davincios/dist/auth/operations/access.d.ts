import type { DaVinciOSRequest } from '../../types/index.js';
import type { SanitizedPermissions } from '../types.js';
type Arguments = {
    req: DaVinciOSRequest;
};
export declare const accessOperation: (args: Arguments) => Promise<SanitizedPermissions>;
export {};
//# sourceMappingURL=access.d.ts.map
