import { parseDaVinciOSComponent } from './parseDaVinciOSComponent.js';
export const getFromImportMap = (args)=>{
    const { importMap, DaVinciOSComponent, schemaPath, silent } = args;
    const { exportName, path } = parseDaVinciOSComponent(DaVinciOSComponent);
    const key = path + '#' + exportName;
    const importMapEntry = importMap[key];
    if (!importMapEntry && !silent) {
        // eslint-disable-next-line no-console
        console.error(`getFromImportMap: DaVinciOSComponent not found in importMap`, {
            key,
            DaVinciOSComponent,
            schemaPath
        }, 'You may need to run the `DaVinciOS generate:importmap` command to generate the importMap ahead of runtime.');
    }
    return importMapEntry;
};

//# sourceMappingURL=getFromImportMap.js.map
