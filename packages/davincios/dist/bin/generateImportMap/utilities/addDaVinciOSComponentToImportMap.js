import crypto from 'crypto';
import path from 'path';
import { parseDaVinciOSComponent } from './parseDaVinciOSComponent.js';
/**
 * Normalizes the component path based on the import map's base directory path.
 */ function getAdjustedComponentPath(importMapToBaseDirPath, componentPath) {
    // Normalize input paths to use forward slashes
    const normalizedBasePath = importMapToBaseDirPath.replace(/\\/g, '/');
    const normalizedComponentPath = componentPath.replace(/\\/g, '/');
    // Base path starts with './' - preserve the './' prefix
    // => import map is in a subdirectory of the base directory, or in the same directory as the base directory
    if (normalizedBasePath.startsWith('./')) {
        // Remove './' from component path if it exists
        const cleanComponentPath = normalizedComponentPath.startsWith('./') ? normalizedComponentPath.substring(2) : normalizedComponentPath;
        // Join the paths to preserve the './' prefix
        return `${normalizedBasePath}${cleanComponentPath}`;
    }
    return path.posix.join(normalizedBasePath, normalizedComponentPath);
}
/**
 * Adds a DaVinciOS component to the import map.
 */ export function addDaVinciOSComponentToImportMap({ importMap, importMapToBaseDirPath, imports, DaVinciOSComponent }) {
    if (!DaVinciOSComponent) {
        return null;
    }
    const { exportName, path: componentPath } = parseDaVinciOSComponent(DaVinciOSComponent);
    if (importMap[componentPath + '#' + exportName]) {
        return null;
    }
    const importIdentifier = exportName + '_' + crypto.createHash('md5').update(componentPath).digest('hex');
    importMap[componentPath + '#' + exportName] = importIdentifier;
    const isRelativePath = componentPath.startsWith('.') || componentPath.startsWith('/');
    if (isRelativePath) {
        const adjustedComponentPath = getAdjustedComponentPath(importMapToBaseDirPath, componentPath);
        imports[importIdentifier] = {
            path: adjustedComponentPath,
            specifier: exportName
        };
        return {
            path: adjustedComponentPath,
            specifier: exportName
        };
    } else {
        // Tsconfig alias or package import, e.g. '@davincios/ui' or '@/components/MyComponent'
        imports[importIdentifier] = {
            path: componentPath,
            specifier: exportName
        };
        return {
            path: componentPath,
            specifier: exportName
        };
    }
}

//# sourceMappingURL=addDaVinciOSComponentToImportMap.js.map
