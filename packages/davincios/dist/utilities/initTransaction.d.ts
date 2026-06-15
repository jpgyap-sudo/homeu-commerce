import type { MarkRequired } from 'ts-essentials';
import type { DaVinciOSRequest } from '../types/index.js';
/**
 * Starts a new transaction using the db adapter with a random id and then assigns it to the req.transaction
 * @returns true if beginning a transaction and false when req already has a transaction to use
 */
export declare function initTransaction(req: MarkRequired<Partial<DaVinciOSRequest>, '@davincios/cms'>): Promise<boolean>;
//# sourceMappingURL=initTransaction.d.ts.map
