import type { DaVinciOSRequest } from '../types/index.js';
type CorsArgs = {
    headers: Headers;
    req: Partial<DaVinciOSRequest>;
};
export declare const headersWithCors: ({ headers, req }: CorsArgs) => Headers;
export {};
//# sourceMappingURL=headersWithCors.d.ts.map
