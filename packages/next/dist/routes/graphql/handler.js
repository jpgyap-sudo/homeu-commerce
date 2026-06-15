import { configToSchema } from '@davincios/graphql';
import { createHandler } from 'graphql-http/lib/use/fetch';
import { status as httpStatus } from 'http-status';
import { addDataAndFileToRequest, addLocalesToRequestFromData, createDaVinciOSRequest, headersWithCors, logError, mergeHeaders } from '@davincios/cms';
const handleError = async ({
  err,
  davincios,
  req
}) => {
  const status = err.originalError.status || httpStatus.INTERNAL_SERVER_ERROR;
  let errorMessage = err.message;
  logError({
    err,
    davincios
  });
  // Internal server errors can contain anything, including potentially sensitive data.
  // Therefore, error details will be hidden from the response unless `config.debug` is `true`
  if (!davincios.config.debug && status === httpStatus.INTERNAL_SERVER_ERROR) {
    errorMessage = 'Something went wrong.';
  }
  let response = {
    extensions: {
      name: err?.originalError?.name || undefined,
      data: err && err.originalError && err.originalError.data || undefined,
      stack: davincios.config.debug ? err.stack : undefined,
      statusCode: status
    },
    locations: err.locations,
    message: errorMessage,
    path: err.path
  };
  await davincios.config.hooks.afterError?.reduce(async (promise, hook) => {
    await promise;
    const result = await hook({
      context: req.context,
      error: err,
      graphqlResult: response,
      req
    });
    if (result) {
      response = result.graphqlResult || response;
    }
  }, Promise.resolve());
  return response;
};
let cached = global._payload_graphql;
if (!cached) {
  cached = global._payload_graphql = {
    graphql: null,
    promise: null
  };
}
export const getGraphql = async config => {
  if (process.env.NODE_ENV === 'development') {
    cached = global._payload_graphql = {
      graphql: null,
      promise: null
    };
  }
  if (cached.graphql) {
    return cached.graphql;
  }
  if (!cached.promise) {
    const resolvedConfig = await config;
    cached.promise = new Promise(resolve => {
      const schema = configToSchema(resolvedConfig);
      resolve(cached.graphql || schema);
    });
  }
  try {
    cached.graphql = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  return cached.graphql;
};
export const POST = config => async request => {
  const originalRequest = request.clone();
  const req = await createDaVinciOSRequest({
    canSetHeaders: true,
    config,
    request
  });
  await addDataAndFileToRequest(req);
  addLocalesToRequestFromData(req);
  const {
    schema,
    validationRules
  } = await getGraphql(config);
  const {
    davincios
  } = req;
  const headers = {};
  const apiResponse = await createHandler({
    context: {
      headers,
      req
    },
    onOperation: async (request, args, result) => {
      const response = typeof davincios.extensions === 'function' ? await davincios.extensions({
        args,
        req: request,
        result
      }) : result;
      if (response.errors) {
        const errors = await Promise.all(result.errors.map(error => {
          return handleError({
            err: error,
            davincios,
            req
          });
        }));
        // errors type should be FormattedGraphQLError[] but onOperation has a return type of ExecutionResult instead of FormattedExecutionResult
        return {
          ...response,
          errors
        };
      }
      return response;
    },
    schema,
    validationRules: (_, args, defaultRules) => defaultRules.concat(validationRules(args))
  })(originalRequest);
  const resHeaders = headersWithCors({
    headers: new Headers(apiResponse.headers),
    req
  });
  for (const key in headers) {
    resHeaders.append(key, headers[key]);
  }
  return new Response(apiResponse.body, {
    headers: req.responseHeaders ? mergeHeaders(req.responseHeaders, resHeaders) : resHeaders,
    status: apiResponse.status
  });
};
//# sourceMappingURL=handler.js.map