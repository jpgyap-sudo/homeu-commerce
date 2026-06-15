import type { DaVinciOS } from '../../../index.js';
import type { DaVinciOSRequest } from '../../../types/index.js';
export type AdminInitEvent = {
    domainID?: string;
    type: 'admin-init';
    userID?: string;
};
type Args = {
    headers: Request['headers'];
    DaVinciOS: DaVinciOS;
    user: DaVinciOSRequest['user'];
};
export declare const adminInit: ({ headers, DaVinciOS, user }: Args) => void;
export {};
//# sourceMappingURL=adminInit.d.ts.map
