import { renderPlaygroundPage } from 'graphql-playground-html';
import { createDaVinciOSRequest } from '@davincios/cms';
import { formatAdminURL } from '@davincios/cms/shared';
export const GET = config => async request => {
  const req = await createDaVinciOSRequest({
    config,
    request
  });
  if (!req.davincios.config.graphQL.disable && !req.davincios.config.graphQL.disablePlaygroundInProduction && process.env.NODE_ENV === 'production' || process.env.NODE_ENV !== 'production') {
    const endpoint = formatAdminURL({
      apiRoute: req.davincios.config.routes.api,
      path: req.davincios.config.routes.graphQL
    });
    return new Response(renderPlaygroundPage({
      endpoint,
      settings: {
        'request.credentials': 'include'
      }
    }), {
      headers: {
        'Content-Type': 'text/html'
      },
      status: 200
    });
  } else {
    return new Response('Route Not Found', {
      status: 404
    });
  }
};
//# sourceMappingURL=playground.js.map