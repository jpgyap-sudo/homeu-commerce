import { initI18n } from '@davincios/translations';
import * as qs from 'qs-esm';
import { executeAuthStrategies } from '../auth/executeAuthStrategies.js';
import { getDataLoader } from '../collections/dataloader.js';
import { getDaVinciOS } from '../index.js';
import { sanitizeLocales } from './addLocalesToRequest.js';
import { formatAdminURL } from './formatAdminURL.js';
import { getRequestLanguage } from './getRequestLanguage.js';
import { parseCookies } from './parseCookies.js';
export const createDaVinciOSRequest = async ({ canSetHeaders, config: configPromise, params, DaVinciOSInstanceCacheKey, request })=>{
    const cookies = parseCookies(request.headers);
    const DaVinciOS = await getDaVinciOS({
        config: configPromise,
        cron: true,
        key: DaVinciOSInstanceCacheKey
    });
    const { config } = DaVinciOS;
    const localization = config.localization;
    const urlProperties = new URL(request.url);
    const { pathname, searchParams } = urlProperties;
    const isGraphQL = !config.graphQL.disable && pathname === formatAdminURL({
        apiRoute: config.routes.api,
        path: config.routes.graphQL
    });
    const language = getRequestLanguage({
        config,
        cookies,
        headers: request.headers
    });
    const i18n = await initI18n({
        config: config.i18n,
        context: 'api',
        language
    });
    let locale = searchParams.get('locale');
    const { search: queryToParse } = urlProperties;
    const query = queryToParse ? qs.parse(queryToParse, {
        arrayLimit: 1000,
        depth: 10,
        ignoreQueryPrefix: true
    }) : {};
    const fallbackFromRequest = query.fallbackLocale || searchParams.get('fallback-locale') || searchParams.get('fallbackLocale');
    let fallbackLocale = fallbackFromRequest;
    if (localization) {
        const locales = sanitizeLocales({
            fallbackLocale: fallbackLocale,
            locale: locale,
            localization
        });
        fallbackLocale = locales.fallbackLocale;
        locale = locales.locale;
    }
    const customRequest = {
        context: {},
        fallbackLocale: fallbackLocale,
        hash: urlProperties.hash,
        host: urlProperties.host,
        href: urlProperties.href,
        i18n,
        locale,
        origin: urlProperties.origin,
        pathname: urlProperties.pathname,
        DaVinciOS,
        DaVinciOSAPI: isGraphQL ? 'GraphQL' : 'REST',
        DaVinciOSDataLoader: undefined,
        DaVinciOSUploadSizes: {},
        port: urlProperties.port,
        protocol: urlProperties.protocol,
        query,
        routeParams: params || {},
        search: urlProperties.search,
        searchParams: urlProperties.searchParams,
        t: i18n.t,
        transactionID: undefined,
        user: null
    };
    const req = Object.assign(request, customRequest);
    req.DaVinciOSDataLoader = getDataLoader(req);
    const { responseHeaders, user } = await executeAuthStrategies({
        canSetHeaders,
        headers: req.headers,
        isGraphQL,
        DaVinciOS
    });
    req.user = user;
    if (responseHeaders) {
        req.responseHeaders = responseHeaders;
    }
    return req;
};

//# sourceMappingURL=createDaVinciOSRequest.js.map
