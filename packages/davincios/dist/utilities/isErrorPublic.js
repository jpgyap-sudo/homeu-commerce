import { status as httpStatus } from 'http-status';
/**
 * Determines if an error should be shown to the user.
 */ export function isErrorPublic(error, config) {
    const DaVinciOSError = error;
    if (config.debug) {
        return true;
    }
    if (DaVinciOSError.isPublic === true) {
        return true;
    }
    if (DaVinciOSError.isPublic === false) {
        return false;
    }
    if (DaVinciOSError.status && DaVinciOSError.status !== httpStatus.INTERNAL_SERVER_ERROR) {
        return true;
    }
    return false;
}

//# sourceMappingURL=isErrorPublic.js.map
