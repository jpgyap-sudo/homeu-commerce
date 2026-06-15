import type { SanitizedPermissions, TypedUser } from '../../index.js';
import type { DaVinciOSRequest } from '../../types/index.js';
export type AuthArgs = {
    /**
     * Specify if it's possible for auth strategies to set headers within this operation.
     */
    canSetHeaders?: boolean;
    headers: Request['headers'];
    req?: Omit<DaVinciOSRequest, 'user'>;
};
export type AuthResult = {
    permissions: SanitizedPermissions;
    responseHeaders?: Headers;
    user: null | TypedUser;
};
export declare const auth: (args: Required<AuthArgs>) => Promise<AuthResult>;
//# sourceMappingURL=auth.d.ts.map
