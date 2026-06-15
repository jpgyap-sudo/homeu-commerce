import { status as httpStatus } from 'http-status';
import { match } from 'path-to-regexp';
import { createDaVinciOSRequest } from './createDaVinciOSRequest.js';
import { formatAdminURL } from './formatAdminURL.js';
import { headersWithCors } from './headersWithCors.js';
import { mergeHeaders } from './mergeHeaders.js';
import { routeError } from './routeError.js';
const notFoundResponse = (req, pathname)=>{
    return Response.json({
        message: `Route not found "${pathname ?? new URL(req.url).pathname}"`
    }, {
        headers: headersWithCors({
            headers: new Headers(),
            req
        }),
        status: httpStatus.NOT_FOUND
    });
};
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
 */ export const handleEndpoints = async ({ basePath = '', config: incomingConfig, path, DaVinciOSInstanceCacheKey, request })=>{
    let handler;
    let req;
    let collection;
    // This can be used against GET request search params size limit.
    // Instead you can do POST request with a text body as search params.
    // We use this internally for relationships querying on the frontend
    // packages/ui/src/fields/Relationship/index.tsx
    if (request.method.toLowerCase() === 'post' && (request.headers.get('X-DaVinciOS-HTTP-Method-Override') === 'GET' || request.headers.get('X-HTTP-Method-Override') === 'GET')) {
        let url = request.url;
        let data = undefined;
        if (request.headers.get('Content-Type') === 'application/x-www-form-urlencoded') {
            const search = await request.text();
            url = `${request.url}?${search}`;
        } else if (request.headers.get('Content-Type') === 'application/json') {
            // May not be supported by every endpoint
            data = await request.json();
            // locale and fallbackLocale is read by createDaVinciOSRequest to populate req.locale and req.fallbackLocale
            // => add to searchParams
            if (data?.locale) {
                url += `?locale=${data.locale}`;
            }
            if (data?.fallbackLocale) {
                url += `&fallbackLocale=${data.depth}`;
            }
        }
        const req = new Request(url, {
            // @ts-expect-error // TODO: check if this is required
            cache: request.cache,
            credentials: request.credentials,
            headers: request.headers,
            method: 'GET',
            signal: request.signal
        });
        if (data) {
            // @ts-expect-error attach data to request - less overhead than using urlencoded
            req.data = data;
        }
        const response = await handleEndpoints({
            basePath,
            config: incomingConfig,
            path,
            DaVinciOSInstanceCacheKey,
            request: req
        });
        return response;
    }
    try {
        req = await createDaVinciOSRequest({
            canSetHeaders: true,
            config: incomingConfig,
            DaVinciOSInstanceCacheKey,
            request
        });
        const { DaVinciOS } = req;
        const { config } = DaVinciOS;
        const pathname = path ?? new URL(req.url).pathname;
        const baseAPIPath = formatAdminURL({
            apiRoute: config.routes.api,
            path: ''
        });
        if (!pathname.startsWith(baseAPIPath)) {
            return notFoundResponse(req, pathname);
        }
        // /api/posts/route -> /posts/route
        let adjustedPathname = pathname.replace(baseAPIPath, '');
        let isGlobals = false;
        // /globals/header/route -> /header/route
        if (adjustedPathname.startsWith('/globals')) {
            isGlobals = true;
            adjustedPathname = adjustedPathname.replace('/globals', '');
        }
        const segments = adjustedPathname.split('/');
        // remove empty string first element
        segments.shift();
        const firstParam = segments[0];
        let globalConfig;
        // first param can be a global slug or collection slug, find the relevant config
        if (firstParam) {
            if (isGlobals) {
                globalConfig = DaVinciOS.globals.config.find((each)=>each.slug === firstParam);
            } else if (DaVinciOS.collections[firstParam]) {
                collection = DaVinciOS.collections[firstParam];
            }
        }
        let endpoints = config.endpoints;
        if (collection) {
            endpoints = collection.config.endpoints;
            // /posts/route -> /route
            adjustedPathname = adjustedPathname.replace(`/${collection.config.slug}`, '');
        } else if (globalConfig) {
            // /header/route -> /route
            adjustedPathname = adjustedPathname.replace(`/${globalConfig.slug}`, '');
            endpoints = globalConfig.endpoints;
        }
        // sanitize when endpoint.path is '/'
        if (adjustedPathname === '') {
            adjustedPathname = '/';
        }
        if (endpoints === false) {
            return Response.json({
                message: `Cannot ${req.method?.toUpperCase()} ${req.url}`
            }, {
                headers: headersWithCors({
                    headers: new Headers(),
                    req
                }),
                status: httpStatus.NOT_IMPLEMENTED
            });
        }
        // Find the relevant endpoint configuration
        const endpoint = endpoints?.find((endpoint)=>{
            if (endpoint.method !== req.method?.toLowerCase()) {
                return false;
            }
            const pathMatchFn = match(endpoint.path, {
                decode: decodeURIComponent
            });
            const matchResult = pathMatchFn(adjustedPathname);
            if (!matchResult) {
                return false;
            }
            req.routeParams = matchResult.params;
            // Inject to routeParams the slug as well so it can be used later
            if (collection) {
                req.routeParams.collection = collection.config.slug;
            } else if (globalConfig) {
                req.routeParams.global = globalConfig.slug;
            }
            return true;
        });
        if (endpoint) {
            handler = endpoint.handler;
        }
        if (!handler) {
            // If no custom handler found and this is an OPTIONS request,
            // return default CORS response for preflight requests
            if (req.method?.toLowerCase() === 'options') {
                return Response.json({}, {
                    headers: headersWithCors({
                        headers: new Headers(),
                        req
                    }),
                    status: 200
                });
            }
            return notFoundResponse(req, pathname);
        }
        const response = await handler(req);
        return new Response(response.body, {
            headers: headersWithCors({
                headers: mergeHeaders(req.responseHeaders ?? new Headers(), response.headers),
                req
            }),
            status: response.status,
            statusText: response.statusText
        });
    } catch (_err) {
        const err = _err;
        return routeError({
            collection,
            config: incomingConfig,
            err,
            req: req
        });
    }
};

//# sourceMappingURL=handleEndpoints.js.map
