import { status as httpStatus } from 'http-status';
import { getRequestCollection } from '../../utilities/getRequestEntity.js';
import { headersWithCors } from '../../utilities/headersWithCors.js';
import { generateExpiredDaVinciOSCookie } from '../cookies.js';
import { logoutOperation } from '../operations/logout.js';
export const logoutHandler = async (req)=>{
    const collection = getRequestCollection(req);
    const { searchParams, t } = req;
    const result = await logoutOperation({
        allSessions: searchParams.get('allSessions') === 'true',
        collection,
        req
    });
    const headers = headersWithCors({
        headers: new Headers(),
        req
    });
    if (!result) {
        return Response.json({
            message: t('error:logoutFailed')
        }, {
            headers,
            status: httpStatus.BAD_REQUEST
        });
    }
    const expiredCookie = generateExpiredDaVinciOSCookie({
        collectionAuthConfig: collection.config.auth,
        config: req.DaVinciOS.config,
        cookiePrefix: req.DaVinciOS.config.cookiePrefix
    });
    headers.set('Set-Cookie', expiredCookie);
    return Response.json({
        message: t('authentication:logoutSuccessful')
    }, {
        headers,
        status: httpStatus.OK
    });
};

//# sourceMappingURL=logout.js.map
