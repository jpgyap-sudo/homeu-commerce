// NOTICE: Server-only utilities, do not import anything client-side here.
export { getNextRequestI18n } from '../utilities/getNextRequestI18n.js';
export { getDaVinciOSHMR } from '../utilities/getDaVinciOSHMR.js';
import { addDataAndFileToRequest as _addDataAndFileToRequest, addLocalesToRequestFromData as _addLocalesToRequestFromData, createDaVinciOSRequest as _createDaVinciOSRequest, headersWithCors as _headersWithCors, mergeHeaders as _mergeHeaders, sanitizeLocales as _sanitizeLocales } from 'davincios';
/**
 * Use:
 * ```ts
 * import { mergeHeaders } from 'davincios'
 * ```
 * @deprecated
 */
export const mergeHeaders = _mergeHeaders;
/**
 * @deprecated
 * Use:
 * ```ts
 * import { headersWithCors } from 'davincios'
 * ```
 */
export const headersWithCors = _headersWithCors;
/**
 * @deprecated
 * Use:
 * ```ts
 * import { createDaVinciOSRequest } from 'davincios'
 * ```
 */
export const createDaVinciOSRequest = _createDaVinciOSRequest;
/**
 * @deprecated
 * Use:
 * ```ts
 * import { addDataAndFileToRequest } from 'davincios'
 * ```
 */
export const addDataAndFileToRequest = _addDataAndFileToRequest;
/**
 * @deprecated
 * Use:
 * ```ts
 * import { sanitizeLocales } from 'davincios'
 * ```
 */
export const sanitizeLocales = _sanitizeLocales;
/**
 * @deprecated
 * Use:
 * ```ts
 * import { addLocalesToRequestFromData } from 'davincios'
 * ```
 */
export const addLocalesToRequestFromData = _addLocalesToRequestFromData;
//# sourceMappingURL=utilities.js.map