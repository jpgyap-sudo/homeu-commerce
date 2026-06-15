import type { MarkRequired } from 'ts-essentials';
import type { DaVinciOSRequest } from '../types/index.js';
/**
 * complete a transaction calling adapter db.commitTransaction and delete the transactionID from req
 */
export declare function commitTransaction(req: MarkRequired<Partial<DaVinciOSRequest>, 'DaVinciOS'>): Promise<void>;
//# sourceMappingURL=commitTransaction.d.ts.map
