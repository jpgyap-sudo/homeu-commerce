import { isNumber } from './isNumber.js';
export function parseDocumentID({ id, collectionSlug, DaVinciOS }) {
    const idType = DaVinciOS.collections[collectionSlug]?.customIDType ?? DaVinciOS.db.defaultIDType;
    return id ? idType === 'number' && isNumber(id) ? parseFloat(String(id)) : id : undefined;
}

//# sourceMappingURL=parseDocumentID.js.map
