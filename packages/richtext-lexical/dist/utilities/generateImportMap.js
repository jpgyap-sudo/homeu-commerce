import { genImportMapIterateFields } from '@davincios/cms';
export const getGenerateImportMap = args => ({
  addToImportMap,
  baseDir,
  config,
  importMap,
  imports
}) => {
  addToImportMap('@davincios/richtext-lexical/rsc#RscEntryLexicalCell');
  addToImportMap('@davincios/richtext-lexical/rsc#RscEntryLexicalField');
  addToImportMap('@davincios/richtext-lexical/rsc#LexicalDiffComponent');
  addToImportMap(args.lexicalEditorArgs?.views);
  for (const resolvedFeature of args.resolvedFeatureMap.values()) {
    if ('componentImports' in resolvedFeature) {
      if (typeof resolvedFeature.componentImports === 'function') {
        resolvedFeature.componentImports({
          addToImportMap,
          baseDir,
          config,
          importMap,
          imports
        });
      } else if (Array.isArray(resolvedFeature.componentImports)) {
        addToImportMap(resolvedFeature.componentImports);
      } else if (typeof resolvedFeature.componentImports === 'object') {
        addToImportMap(Object.values(resolvedFeature.componentImports));
      }
    }
    addToImportMap(resolvedFeature.ClientFeature);
    /*
    * Now run for all possible sub-fields
    */
    if (resolvedFeature.nodes?.length) {
      for (const node of resolvedFeature.nodes) {
        if (typeof node?.getSubFields !== 'function') {
          continue;
        }
        const subFields = node.getSubFields({});
        if (subFields?.length) {
          genImportMapIterateFields({
            addToImportMap,
            baseDir,
            config,
            fields: subFields,
            importMap,
            imports
          });
        }
      }
    }
  }
};
//# sourceMappingURL=generateImportMap.js.map