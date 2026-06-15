import { sendEvent } from '../index.js';
import { oneWayHash } from '../oneWayHash.js';
export const adminInit = ({ headers, DaVinciOS, user })=>{
    const host = headers.get('host');
    let domainID;
    let userID;
    if (host) {
        domainID = oneWayHash(host, DaVinciOS.secret);
    }
    if (user?.id) {
        userID = oneWayHash(String(user.id), DaVinciOS.secret);
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    sendEvent({
        event: {
            type: 'admin-init',
            domainID: domainID,
            userID: userID
        },
        DaVinciOS
    });
};

//# sourceMappingURL=adminInit.js.map
