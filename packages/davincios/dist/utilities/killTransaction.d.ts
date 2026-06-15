import type { MarkRequired } from 'ts-essentials';
import type { DaVinciOSRequest } from '../types/index.js';
/**
 * Rollback the transaction from the req using the db adapter and removes it from the req
 */
export declare function killTransaction(req: MarkRequired<Partial<DaVinciOSRequest>, 'DaVinciOS'>): Promise<void>;
//# sourceMappingURL=killTransaction.d.ts.map
