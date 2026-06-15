/**
 *
 * @deprecated use getObjectDotNotation from `'DaVinciOS/shared'` instead of `'DaVinciOS'`
 *
 * @example
 *
 * ```ts
 * import { getObjectDotNotation } from 'DaVinciOS/shared'
 *
 * const obj = { a: { b: { c: 42 } } }
 * const value = getObjectDotNotation<number>(obj, 'a.b.c', 0) // value is 42
 * const defaultValue = getObjectDotNotation<number>(obj, 'a.b.x', 0) // defaultValue is 0
 * ```
 */
export declare const getObjectDotNotation: <T>(obj: Record<string, unknown>, path: string, defaultValue?: T) => T;
//# sourceMappingURL=getObjectDotNotation.d.ts.map
