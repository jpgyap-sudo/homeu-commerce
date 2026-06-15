import { getTsconfig } from 'get-tsconfig';
import path from 'path';
import { findUpSync } from '../utilities/findUp.js';
/**
 * List of all filenames to detect as a DaVinciOS configuration file.
 */ export const DaVinciOSConfigFileNames = [
    'DaVinciOS.config.js',
    'DaVinciOS.config.ts'
];
/**
 * Returns the source and output paths from the nearest tsconfig.json file.
 * If no tsconfig.json file is found, returns the current working directory.
 * @returns An object containing the source and output paths.
 */ const getTSConfigPaths = ()=>{
    const tsConfigResult = getTsconfig();
    const tsConfig = tsConfigResult.config;
    const tsConfigDir = path.dirname(tsConfigResult.path);
    try {
        const rootConfigDir = path.resolve(tsConfigDir, tsConfig.compilerOptions.baseUrl || '');
        const srcPath = tsConfig.compilerOptions?.rootDir || path.resolve(process.cwd(), 'src');
        const outPath = tsConfig.compilerOptions?.outDir || path.resolve(process.cwd(), 'dist');
        let configPath = tsConfig.compilerOptions?.paths?.['@DaVinciOS-config']?.[0];
        if (configPath) {
            configPath = path.resolve(rootConfigDir, configPath);
        }
        return {
            configPath,
            outPath,
            rootPath: rootConfigDir,
            srcPath,
            tsConfigPath: tsConfigResult.path
        };
    } catch (error) {
        console.error(`Error parsing tsconfig.json: ${error}`); // Do not throw the error, as we can still continue with the other config path finding methods
        return {
            rootPath: process.cwd()
        };
    }
};
/**
 * Searches for a DaVinciOS configuration file.
 * @returns The absolute path to the DaVinciOS configuration file.
 * @throws An error if no configuration file is found.
 */ export const findConfig = ()=>{
    // If the developer has specified a config path,
    // format it if relative and use it directly if absolute
    if (process.env.DaVinciOS_CONFIG_PATH) {
        if (path.isAbsolute(process.env.DaVinciOS_CONFIG_PATH)) {
            return process.env.DaVinciOS_CONFIG_PATH;
        }
        return path.resolve(process.cwd(), process.env.DaVinciOS_CONFIG_PATH);
    }
    const { configPath, outPath, rootPath, srcPath } = getTSConfigPaths();
    // if configPath is absolute file, not folder, return it
    if (configPath && (path.extname(configPath) === '.js' || path.extname(configPath) === '.ts')) {
        return configPath;
    }
    const searchPaths = process.env.NODE_ENV === 'production' ? [
        configPath,
        outPath,
        srcPath,
        rootPath
    ] : [
        configPath,
        srcPath,
        rootPath
    ];
    for (const searchPath of searchPaths){
        if (!searchPath) {
            continue;
        }
        const configPath = findUpSync({
            dir: searchPath,
            fileNames: DaVinciOSConfigFileNames
        });
        if (configPath) {
            return configPath;
        }
    }
    // If no config file is found in the directories defined by tsconfig.json,
    // try searching in the 'src' and 'dist' directory as a last resort, as they are most commonly used
    if (process.env.NODE_ENV === 'production') {
        const distConfigPath = findUpSync({
            dir: path.resolve(process.cwd(), 'dist'),
            fileNames: [
                'DaVinciOS.config.js'
            ]
        });
        if (distConfigPath) {
            return distConfigPath;
        }
    } else {
        const srcConfigPath = findUpSync({
            dir: path.resolve(process.cwd(), 'src'),
            fileNames: DaVinciOSConfigFileNames
        });
        if (srcConfigPath) {
            return srcConfigPath;
        }
    }
    throw new Error('Error: cannot find DaVinciOS config. Please create a configuration file located at the root of your current working directory called "DaVinciOS.config.js" or "DaVinciOS.config.ts".');
};

//# sourceMappingURL=find.js.map
