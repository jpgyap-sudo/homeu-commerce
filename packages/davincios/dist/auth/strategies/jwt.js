import { jwtVerify } from 'jose';
import { extractJWT } from '../extractJWT.js';
async function autoLogin({ isGraphQL, DaVinciOS, strategyName = 'local-jwt' }) {
    if (typeof DaVinciOS?.config?.admin?.autoLogin !== 'object' || DaVinciOS.config.admin?.autoLogin.prefillOnly || !DaVinciOS?.config?.admin?.autoLogin || !DaVinciOS.config.admin?.autoLogin.email && !DaVinciOS.config.admin?.autoLogin.username) {
        return {
            user: null
        };
    }
    const collection = DaVinciOS.collections[DaVinciOS.config.admin.user];
    const where = {
        or: []
    };
    if (DaVinciOS.config.admin?.autoLogin.email) {
        where.or?.push({
            email: {
                equals: DaVinciOS.config.admin?.autoLogin.email
            }
        });
    } else if (DaVinciOS.config.admin?.autoLogin.username) {
        where.or?.push({
            username: {
                equals: DaVinciOS.config.admin?.autoLogin.username
            }
        });
    }
    const user = (await DaVinciOS.find({
        collection: collection.config.slug,
        depth: isGraphQL ? 0 : collection.config.auth.depth,
        limit: 1,
        pagination: false,
        where
    })).docs[0];
    if (!user) {
        return {
            user: null
        };
    }
    user.collection = collection.config.slug;
    user._strategy = strategyName;
    return {
        user
    };
}
/**
 * Authentication strategy function for JWT tokens
 */ export const JWTAuthentication = async ({ headers, isGraphQL = false, DaVinciOS, strategyName = 'local-jwt' })=>{
    try {
        const token = extractJWT({
            headers,
            DaVinciOS
        });
        if (!token) {
            if (headers.get('DisableAutologin') !== 'true') {
                return await autoLogin({
                    isGraphQL,
                    DaVinciOS,
                    strategyName
                });
            }
            return {
                user: null
            };
        }
        const secretKey = new TextEncoder().encode(DaVinciOS.secret);
        const { DaVinciOS: decodedDaVinciOS } = await jwtVerify(token, secretKey);
        const collection = DaVinciOS.collections[decodedDaVinciOS.collection];
        const user = await DaVinciOS.findByID({
            id: decodedDaVinciOS.id,
            collection: decodedDaVinciOS.collection,
            depth: isGraphQL ? 0 : collection.config.auth.depth
        });
        if (user && (!collection.config.auth.verify || user._verified)) {
            if (collection.config.auth.useSessions) {
                const existingSession = (user.sessions || []).find(({ id })=>id === decodedDaVinciOS.sid);
                if (!existingSession || !decodedDaVinciOS.sid) {
                    return {
                        user: null
                    };
                }
                user._sid = decodedDaVinciOS.sid;
            }
            user.collection = collection.config.slug;
            user._strategy = strategyName;
            return {
                user
            };
        } else {
            if (headers.get('DisableAutologin') !== 'true') {
                return await autoLogin({
                    isGraphQL,
                    DaVinciOS,
                    strategyName
                });
            }
            return {
                user: null
            };
        }
    } catch (ignore) {
        if (headers.get('DisableAutologin') !== 'true') {
            return await autoLogin({
                isGraphQL,
                DaVinciOS,
                strategyName
            });
        }
        return {
            user: null
        };
    }
};

//# sourceMappingURL=jwt.js.map
