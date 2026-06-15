/**
 *
 * @deprecated use getObjectDotNotation from `'@davincios/cms/shared'` instead of `'@davincios/cms'`
 *
 * @example
 *
 * ```ts
 * import { getObjectDotNotation } from '@davincios/cms/shared'
 *
 * const obj = { a: { b: { c: 42 } } }
 * const value = getObjectDotNotation<number>(obj, 'a.b.c', 0) // value is 42
 * const defaultValue = getObjectDotNotation<number>(obj, 'a.b.x', 0) // defaultValue is 0
 * ```
 */ export const getObjectDotNotation = (obj, path, defaultValue)=>{
    if (!path || !obj) {
        return defaultValue;
    }
    const result = path.split('.').reduce((o, i)=>o?.[i], obj);
    return result === undefined ? defaultValue : result;
};

//# sourceMappingURL=getObjectDotNotation.js.map
