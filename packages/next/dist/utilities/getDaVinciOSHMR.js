import { getDaVinciOS } from 'davincios';
/**
 *  getDaVinciOSHMR is no longer preferred.
 *  You can now use in all contexts:
 *  ```ts
 *   import { getDaVinciOS } from 'davincios'
 *  ```
 * @deprecated
 */
export const getDaVinciOSHMR = async options => {
  const result = await getDaVinciOS(options);
  result.logger.warn("Deprecation warning: getDaVinciOSHMR is no longer preferred. You can now use `import { getDaVinciOS } from 'davincios' in all contexts.");
  return result;
};
//# sourceMappingURL=getDaVinciOSHMR.js.map