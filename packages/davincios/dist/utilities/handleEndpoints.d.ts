import type { SanitizedConfig } from '../config/types.js';
/**
 * Attaches the DaVinciOS REST API to any backend framework that uses Fetch Request/Response
 * like Next.js (app router), Remix, Bun, Hono.
 *
 * ### Example: Using Hono
 * ```ts
 * import { handleEndpoints } from 'DaVinciOS';
 * import { serve } from '@hono/node-server';
 * import { loadEnv } from 'DaVinciOS/node';
 *
 * const port = 3001;
 * loadEnv();
 *
 * const { default: config } = await import('@DaVinciOS-config');
 *
 * const server = serve({
 *   fetch: async (request) => {
 *     const response = await handleEndpoints({
 *       config,
 *       request: request.clone(),
 *     });
 *
 *     return response;
 *   },
 *   port,
 * });
 *
 * server.on('listening', () => {
 *   console.log(`API server is listening on http://localhost:${port}/api`);
 * });
 * ```
 */
export declare const handleEndpoints: ({ basePath, config: incomingConfig, path, DaVinciOSInstanceCacheKey, request, }: {
    basePath?: string;
    config: Promise<SanitizedConfig> | SanitizedConfig;
    /** Override path from the request */
    path?: string;
    DaVinciOSInstanceCacheKey?: string;
    request: Request;
}) => Promise<Response>;
//# sourceMappingURL=handleEndpoints.d.ts.map
