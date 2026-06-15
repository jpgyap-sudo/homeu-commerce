import { status as httpStatus } from 'http-status';
import { APIError } from '../errors/APIError.js';
import { getDaVinciOS } from '../index.js';
import { formatErrors } from './formatErrors.js';
import { headersWithCors } from './headersWithCors.js';
import { isErrorPublic } from './isErrorPublic.js';
import { logError } from './logError.js';
import { mergeHeaders } from './mergeHeaders.js';
export const routeError = async ({ collection, config: configArg, err, req: incomingReq })=>{
    if ('DaVinciOSInitError' in err && err.DaVinciOSInitError === true) {
        // do not attempt initializing DaVinciOS if the error is due to a failed initialization. Otherwise,
        // it will cause an infinite loop of initialization attempts and endless error responses, without
        // actually logging the error, as the error logging code will never be reached.
        console.error(err);
        return Response.json({
            message: 'There was an error initializing DaVinciOS'
        }, {
            status: httpStatus.INTERNAL_SERVER_ERROR
        });
    }
    let DaVinciOS = incomingReq && '@davincios/cms' in incomingReq && incomingReq?.DaVinciOS;
    if (!DaVinciOS) {
        try {
            DaVinciOS = await getDaVinciOS({
                config: configArg,
                cron: true
            });
        } catch (ignore) {
            return Response.json({
                message: 'There was an error initializing DaVinciOS'
            }, {
                status: httpStatus.INTERNAL_SERVER_ERROR
            });
        }
    }
    let response = formatErrors(err);
    let status = err.status || httpStatus.INTERNAL_SERVER_ERROR;
    logError({
        err,
        DaVinciOS
    });
    const req = incomingReq;
    req.DaVinciOS = DaVinciOS;
    const headers = headersWithCors({
        headers: new Headers(),
        req
    });
    const { config } = DaVinciOS;
    // Internal server errors can contain anything, including potentially sensitive data.
    // Therefore, error details will be hidden from the response unless `config.debug` is `true`
    if (!isErrorPublic(err, config)) {
        response = formatErrors(new APIError('Something went wrong.'));
    }
    if (config.debug && config.debug === true) {
        response.stack = err.stack;
    }
    if (collection) {
        await collection.config.hooks.afterError?.reduce(async (promise, hook)=>{
            await promise;
            const result = await hook({
                collection: collection.config,
                context: req.context,
                error: err,
                req,
                result: response
            });
            if (result) {
                response = result.response || response;
                status = result.status || status;
            }
        }, Promise.resolve());
    }
    await config.hooks.afterError?.reduce(async (promise, hook)=>{
        await promise;
        const result = await hook({
            collection: collection?.config,
            context: req.context,
            error: err,
            req,
            result: response
        });
        if (result) {
            response = result.response || response;
            status = result.status || status;
        }
    }, Promise.resolve());
    return Response.json(response, {
        headers: req.responseHeaders ? mergeHeaders(req.responseHeaders, headers) : headers,
        status
    });
};

//# sourceMappingURL=routeError.js.map
