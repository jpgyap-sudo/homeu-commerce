import { execSync } from 'child_process';
import ciInfo from 'ci-info';
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { findUp } from '../findUp.js';
import { Conf } from './conf/index.js';
import { oneWayHash } from './oneWayHash.js';
let baseEvent = null;
export const sendEvent = async ({ event, DaVinciOS })=>{
    try {
        if (DaVinciOS.config.telemetry !== false) {
            const { packageJSON, packageJSONPath } = await getPackageJSON();
            // Only generate the base event once
            if (!baseEvent) {
                const { projectID, source: projectIDSource } = getProjectID(DaVinciOS, packageJSON);
                baseEvent = {
                    ciName: ciInfo.isCI ? ciInfo.name : null,
                    envID: getEnvID(),
                    isCI: ciInfo.isCI,
                    nodeEnv: process.env.NODE_ENV || 'development',
                    nodeVersion: process.version,
                    DaVinciOSVersion: getDaVinciOSVersion(packageJSON),
                    projectID,
                    projectIDSource,
                    ...getLocalizationInfo(DaVinciOS),
                    dbAdapter: DaVinciOS.db.name,
                    emailAdapter: DaVinciOS.email?.name || null,
                    uploadAdapters: DaVinciOS.config.upload.adapters
                };
            }
            if (process.env.DaVinciOS_TELEMETRY_DEBUG) {
                DaVinciOS.logger.info({
                    event: {
                        ...baseEvent,
                        ...event,
                        packageJSONPath
                    },
                    msg: 'Telemetry Event'
                });
                return;
            }
            await fetch('https://telemetry.DaVinciOScms.com/events', {
                body: JSON.stringify({
                    ...baseEvent,
                    ...event
                }),
                headers: {
                    'Content-Type': 'application/json'
                },
                method: 'post'
            });
        }
    } catch (_) {
    // Eat any errors in sending telemetry event
    }
};
/**
 * This is a quasi-persistent identifier used to dedupe recurring events. It's
 * generated from random data and completely anonymous.
 */ const getEnvID = ()=>{
    const conf = new Conf();
    const ENV_ID = 'envID';
    const val = conf.get(ENV_ID);
    if (val) {
        return val;
    }
    const generated = randomBytes(32).toString('hex');
    conf.set(ENV_ID, generated);
    return generated;
};
const getProjectID = (DaVinciOS, packageJSON)=>{
    const gitID = getGitID(DaVinciOS);
    if (gitID) {
        return {
            projectID: oneWayHash(gitID, DaVinciOS.secret),
            source: 'git'
        };
    }
    const packageJSONID = getPackageJSONID(DaVinciOS, packageJSON);
    if (packageJSONID) {
        return {
            projectID: oneWayHash(packageJSONID, DaVinciOS.secret),
            source: 'packageJSON'
        };
    }
    const serverURL = DaVinciOS.config.serverURL;
    if (serverURL) {
        return {
            projectID: oneWayHash(serverURL, DaVinciOS.secret),
            source: 'serverURL'
        };
    }
    const cwd = process.cwd();
    return {
        projectID: oneWayHash(cwd, DaVinciOS.secret),
        source: 'cwd'
    };
};
const getGitID = (DaVinciOS)=>{
    try {
        const originBuffer = execSync('git config --local --get remote.origin.url', {
            stdio: 'pipe',
            timeout: 1000
        });
        return oneWayHash(String(originBuffer).trim(), DaVinciOS.secret);
    } catch (_) {
        return null;
    }
};
const getPackageJSON = async ()=>{
    let packageJSONPath = path.resolve(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJSONPath)) {
        // Old logic
        const filename = fileURLToPath(import.meta.url);
        const dirname = path.dirname(filename);
        packageJSONPath = await findUp({
            dir: dirname,
            fileNames: [
                'package.json'
            ]
        });
    }
    const jsonContentString = await fs.promises.readFile(packageJSONPath, 'utf-8');
    const jsonContent = JSON.parse(jsonContentString);
    return {
        packageJSON: jsonContent,
        packageJSONPath
    };
};
const getPackageJSONID = (DaVinciOS, packageJSON)=>{
    return oneWayHash(packageJSON.name, DaVinciOS.secret);
};
export const getDaVinciOSVersion = (packageJSON)=>{
    return packageJSON?.dependencies?.DaVinciOS ?? '';
};
export const getLocalizationInfo = (DaVinciOS)=>{
    if (!DaVinciOS.config.localization) {
        return {
            locales: [],
            localizationDefaultLocale: null,
            localizationEnabled: false
        };
    }
    return {
        locales: DaVinciOS.config.localization.localeCodes,
        localizationDefaultLocale: DaVinciOS.config.localization.defaultLocale,
        localizationEnabled: true
    };
};

//# sourceMappingURL=index.js.map
