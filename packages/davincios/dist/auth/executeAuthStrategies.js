import { logError } from '../utilities/logError.js';
import { mergeHeaders } from '../utilities/mergeHeaders.js';
// Resolve the davincios instance from args, supporting both
// lowercase (initReq.js) and PascalCase (operations/auth.js) callers.
const resolveDaVinciOS = (args)=> args.davincios || args.DaVinciOS;
export const executeAuthStrategies = async (args)=>{
    let result = {
        user: null
    };
    const davincios = resolveDaVinciOS(args);
    if (!davincios?.authStrategies?.length) {
        return result;
    }
    for (const strategy of davincios.authStrategies){
        // add the configured AuthStrategy `name` to the strategy function args
        args.strategyName = strategy.name;
        args.isGraphQL = Boolean(args.isGraphQL);
        args.canSetHeaders = Boolean(args.canSetHeaders);
        try {
            const authResult = await strategy.authenticate(args);
            if (authResult.responseHeaders) {
                authResult.responseHeaders = mergeHeaders(result.responseHeaders || new Headers(), authResult.responseHeaders || new Headers());
            }
            result = authResult;
        } catch (err) {
            logError({
                err,
                davincios
            });
        }
        if (result.user) {
            return result;
        }
    }
    return result;
};

//# sourceMappingURL=executeAuthStrategies.js.map
