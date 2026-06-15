import type { DaVinciOSComponent } from '../../../config/types.js';
import type { Imports, InternalImportMap } from '../index.js';
/**
 * Adds a DaVinciOS component to the import map.
 */
export declare function addDaVinciOSComponentToImportMap({ importMap, importMapToBaseDirPath, imports, DaVinciOSComponent, }: {
    importMap: InternalImportMap;
    importMapToBaseDirPath: string;
    imports: Imports;
    DaVinciOSComponent: DaVinciOSComponent;
}): {
    path: string;
    specifier: string;
} | null;
//# sourceMappingURL=addDaVinciOSComponentToImportMap.d.ts.map
