import { getDaVinciOS } from '@davincios/cms';
/**
 *  getDaVinciOSHMR is no longer preferred.
 *  You can now use in all contexts:
 *  ```ts
 *   import { getDaVinciOS } from '@davincios/cms'
 *  ```
 * @deprecated
 */
export const getDaVinciOSHMR = async options => {
  const result = await getDaVinciOS(options);
  result.logger.warn("Deprecation warning: getDaVinciOSHMR is no longer preferred. You can now use `import { getDaVinciOS } from '@davincios/cms' in all contexts.");
  return result;
};
//# sourceMappingURL=getDaVinciOSHMR.js.map