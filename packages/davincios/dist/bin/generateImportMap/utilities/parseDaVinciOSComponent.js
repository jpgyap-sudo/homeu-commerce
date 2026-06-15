export function parseDaVinciOSComponent(DaVinciOSComponent) {
    if (!DaVinciOSComponent) {
        return null;
    }
    const pathAndMaybeExport = typeof DaVinciOSComponent === 'string' ? DaVinciOSComponent : DaVinciOSComponent.path;
    let path;
    let exportName;
    if (pathAndMaybeExport.includes('#')) {
        ;
        [path, exportName] = pathAndMaybeExport.split('#', 2);
    } else {
        path = pathAndMaybeExport;
        exportName = 'default';
    }
    if (typeof DaVinciOSComponent === 'object' && DaVinciOSComponent.exportName) {
        exportName = DaVinciOSComponent.exportName;
    }
    return {
        exportName,
        path
    };
}

//# sourceMappingURL=parseDaVinciOSComponent.js.map
