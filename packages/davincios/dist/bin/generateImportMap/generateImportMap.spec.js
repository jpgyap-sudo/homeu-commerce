import { describe, beforeEach, expect, it, vitest } from 'vitest';
import { addDaVinciOSComponentToImportMap } from './utilities/addDaVinciOSComponentToImportMap.js';
import { getImportMapToBaseDirPath } from './utilities/getImportMapToBaseDirPath.js';
describe('addDaVinciOSComponentToImportMap', ()=>{
    let importMap;
    let imports;
    beforeEach(()=>{
        importMap = {};
        imports = {};
        vitest.restoreAllMocks();
    });
    function componentPathTest({ baseDir, importMapFilePath, DaVinciOSComponent, expectedPath, expectedSpecifier, expectedImportMapToBaseDirPath }) {
        const importMapToBaseDirPath = getImportMapToBaseDirPath({
            baseDir,
            importMapPath: importMapFilePath
        });
        expect(importMapToBaseDirPath).toBe(expectedImportMapToBaseDirPath);
        const { path, specifier } = addDaVinciOSComponentToImportMap({
            importMapToBaseDirPath,
            importMap,
            imports,
            DaVinciOSComponent
        }) ?? {};
        expect(path).toBe(expectedPath);
        expect(specifier).toBe(expectedSpecifier);
    }
    it('relative path with import map partially in base dir', ()=>{
        componentPathTest({
            baseDir: '/myPackage/test/myTest',
            importMapFilePath: '/myPackage/app/(DaVinciOS)/importMap.js',
            DaVinciOSComponent: './MyComponent.js#MyExport',
            expectedImportMapToBaseDirPath: '../../test/myTest/',
            expectedPath: '../../test/myTest/MyComponent.js',
            expectedSpecifier: 'MyExport'
        });
    });
    it('relative path with import map partially in base dir 2', ()=>{
        componentPathTest({
            baseDir: '/myPackage/test/myTest',
            importMapFilePath: '/myPackage/test/prod/app/(DaVinciOS)/importMap.js',
            DaVinciOSComponent: {
                path: './MyComponent.js#MyExport'
            },
            expectedImportMapToBaseDirPath: '../../../myTest/',
            expectedPath: '../../../myTest/MyComponent.js',
            expectedSpecifier: 'MyExport'
        });
    });
    it('relative path with import map partially in base dir 3', ()=>{
        componentPathTest({
            baseDir: '/myPackage/test/myTest',
            importMapFilePath: '/myPackage/test/prod/app/(DaVinciOS)/importMap.js',
            DaVinciOSComponent: {
                path: '../otherTest/MyComponent.js',
                exportName: 'MyExport'
            },
            expectedImportMapToBaseDirPath: '../../../myTest/',
            expectedPath: '../../../otherTest/MyComponent.js',
            expectedSpecifier: 'MyExport'
        });
    });
    it('relative path with import map within base dir', ()=>{
        componentPathTest({
            baseDir: '/myPackage/test/myTest',
            importMapFilePath: '/myPackage/test/myTest/prod/app/(DaVinciOS)/importMap.js',
            DaVinciOSComponent: './MyComponent.js#MyExport',
            expectedImportMapToBaseDirPath: '../../../',
            expectedPath: '../../../MyComponent.js',
            expectedSpecifier: 'MyExport'
        });
    });
    it('relative path with import map not in base dir', ()=>{
        componentPathTest({
            baseDir: '/test/myTest',
            importMapFilePath: '/app/(DaVinciOS)/importMap.js',
            DaVinciOSComponent: './MyComponent.js#MyExport',
            expectedImportMapToBaseDirPath: '../../test/myTest/',
            expectedPath: '../../test/myTest/MyComponent.js',
            expectedSpecifier: 'MyExport'
        });
    });
    it('relative path with import map not in base dir 2', ()=>{
        componentPathTest({
            baseDir: '/test/myTest',
            importMapFilePath: '/app/(DaVinciOS)/importMap.js',
            DaVinciOSComponent: '../myOtherTest/MyComponent.js#MyExport',
            expectedImportMapToBaseDirPath: '../../test/myTest/',
            expectedPath: '../../test/myOtherTest/MyComponent.js',
            expectedSpecifier: 'MyExport'
        });
    });
    it('relative path with import map not in base dir, baseDir ending with slash', ()=>{
        componentPathTest({
            baseDir: '/test/myTest/',
            importMapFilePath: '/app/(DaVinciOS)/importMap.js',
            DaVinciOSComponent: './MyComponent.js#MyExport',
            expectedImportMapToBaseDirPath: '../../test/myTest/',
            expectedPath: '../../test/myTest/MyComponent.js',
            expectedSpecifier: 'MyExport'
        });
    });
    it('relative path with import map not in base dir, component starting with slash', ()=>{
        componentPathTest({
            baseDir: '/test/myTest',
            importMapFilePath: '/app/(DaVinciOS)/importMap.js',
            DaVinciOSComponent: '/MyComponent.js#MyExport',
            expectedImportMapToBaseDirPath: '../../test/myTest/',
            expectedPath: '../../test/myTest/MyComponent.js',
            expectedSpecifier: 'MyExport'
        });
    });
    it('aliased path', ()=>{
        componentPathTest({
            baseDir: '/test/myTest',
            importMapFilePath: '/app/(DaVinciOS)/importMap.js',
            DaVinciOSComponent: '@components/MyComponent.js#MyExport',
            expectedImportMapToBaseDirPath: '../../test/myTest/',
            expectedPath: '@components/MyComponent.js',
            expectedSpecifier: 'MyExport'
        });
    });
    it('aliased path in DaVinciOSComponent object', ()=>{
        componentPathTest({
            baseDir: '/test/',
            importMapFilePath: '/app/(DaVinciOS)/importMap.js',
            DaVinciOSComponent: {
                path: '@components/MyComponent.js'
            },
            expectedImportMapToBaseDirPath: '../../test/',
            expectedPath: '@components/MyComponent.js',
            expectedSpecifier: 'default'
        });
    });
    it('relative path import starting with slash, going up', ()=>{
        componentPathTest({
            baseDir: '/test/myTest',
            importMapFilePath: '/test/myTest/app/importMap.js',
            DaVinciOSComponent: '/../MyComponent.js#MyExport',
            expectedImportMapToBaseDirPath: '../',
            expectedPath: '../../MyComponent.js',
            expectedSpecifier: 'MyExport'
        });
    });
    it('relative path import starting with dot-slash, going up', ()=>{
        componentPathTest({
            baseDir: '/test/myTest',
            importMapFilePath: '/test/myTest/app/importMap.js',
            DaVinciOSComponent: './../MyComponent.js#MyExport',
            expectedImportMapToBaseDirPath: '../',
            expectedPath: '../../MyComponent.js',
            expectedSpecifier: 'MyExport'
        });
    });
    it('importMap and baseDir in same directory', ()=>{
        componentPathTest({
            baseDir: '/test/myTest',
            importMapFilePath: '/test/myTest/importMap.js',
            DaVinciOSComponent: './MyComponent.js#MyExport',
            expectedImportMapToBaseDirPath: './',
            expectedPath: './MyComponent.js',
            expectedSpecifier: 'MyExport'
        });
    });
    it('baseDir within importMap dir', ()=>{
        componentPathTest({
            baseDir: '/test/myTest/components',
            importMapFilePath: '/test/myTest/importMap.js',
            DaVinciOSComponent: './MyComponent.js#MyExport',
            expectedImportMapToBaseDirPath: './components/',
            expectedPath: './components/MyComponent.js',
            expectedSpecifier: 'MyExport'
        });
    });
});

//# sourceMappingURL=generateImportMap.spec.js.map
