/* eslint-disable no-console */ import { Cron } from 'croner';
import minimist from 'minimist';
import { pathToFileURL } from 'node:url';
import path from 'path';
import { findConfig } from '../config/find.js';
import { getDaVinciOS } from '../index.js';
import { generateImportMap } from './generateImportMap/index.js';
import { generateTypes } from './generateTypes.js';
import { info } from './info.js';
import { loadEnv } from './loadEnv.js';
import { migrate, availableCommands as migrateCommands } from './migrate.js';
// Note: this does not account for any user bin scripts
const availableScripts = [
    'generate:db-schema',
    'generate:importmap',
    'generate:types',
    'info',
    'jobs:run',
    'jobs:handle-schedules',
    'run',
    ...migrateCommands
];
export const bin = async ()=>{
    loadEnv();
    process.env.DISABLE_DaVinciOS_HMR = 'true';
    const args = minimist(process.argv.slice(2));
    const script = (typeof args._[0] === 'string' ? args._[0] : '').toLowerCase();
    if (args.cron) {
        new Cron(args.cron, async ()=>{
            // If the bin script initializes DaVinciOS (getDaVinciOS), this will only happen once, as getDaVinciOS
            // caches the DaVinciOS instance on the module scope => no need to manually cache and manage getDaVinciOS initialization
            // outside the Cron here.
            await runBinScript({
                args,
                script
            });
        }, {
            // Do not run consecutive crons if previous crons still ongoing
            protect: true,
            // TODO: Remove this compatibility option in 4.0. This only exists to ensure backwards-compatibility between Croner v9 and Croner v10 cron syntax
            sloppyRanges: true
        });
        process.stdin.resume(); // Keep the process alive
        return;
    } else {
        const { DaVinciOS } = await runBinScript({
            args,
            script
        });
        if (DaVinciOS) {
            await DaVinciOS.destroy(); // close database connections after running jobs so process can exit cleanly
        }
        process.exit(0);
    }
};
async function runBinScript({ args, script }) {
    if (script === 'info') {
        await info();
        return {};
    }
    if (script === 'run') {
        const scriptPath = args._[1];
        if (!scriptPath) {
            console.error('Please provide a script path to run.');
            process.exit(1);
        }
        const absoluteScriptPath = path.resolve(process.cwd(), scriptPath);
        // Modify process.argv to remove 'run' and the script path
        const originalArgv = process.argv;
        process.argv = [
            process.argv[0],
            process.argv[1],
            ...args._.slice(2)
        ];
        try {
            await import(pathToFileURL(absoluteScriptPath).toString());
        } catch (error) {
            console.error(`Error running script: ${absoluteScriptPath}`);
            console.error(error);
            process.exit(1);
        } finally{
            // Restore original process.argv
            process.argv = originalArgv;
        }
        return {};
    }
    const configPath = findConfig();
    const configPromise = await import(pathToFileURL(configPath).toString());
    let config = await configPromise;
    if (config.default) {
        config = await config.default;
    }
    const userBinScript = Array.isArray(config.bin) ? config.bin.find(({ key })=>key === script) : false;
    if (userBinScript) {
        try {
            const module = await import(pathToFileURL(userBinScript.scriptPath).toString());
            if (!module.script || typeof module.script !== 'function') {
                console.error(`Could not find "script" function export for script ${userBinScript.key} in ${userBinScript.scriptPath}`);
            } else {
                await module.script(config).catch((err)=>{
                    console.log(`Script ${userBinScript.key} failed, details:`);
                    console.error(err);
                });
            }
        } catch (err) {
            console.log(`Could not find associated bin script for the ${userBinScript.key} command`);
            console.error(err);
        }
        return {};
    }
    if (script.startsWith('migrate')) {
        await migrate({
            config,
            parsedArgs: args
        });
        return {};
    }
    if (script === 'generate:types') {
        await generateTypes(config);
        return {};
    }
    if (script === 'generate:importmap') {
        await generateImportMap(config);
        return {};
    }
    if (script === 'jobs:run') {
        const DaVinciOS = await getDaVinciOS({
            config
        }) // Do not setup crons here - this bin script can set up its own crons
        ;
        const limit = args.limit ? parseInt(args.limit, 10) : undefined;
        const queue = args.queue ? args.queue : undefined;
        const allQueues = !!args['all-queues'];
        const handleSchedules = !!args['handle-schedules'];
        if (handleSchedules) {
            await DaVinciOS.jobs.handleSchedules({
                allQueues,
                queue
            });
        }
        await DaVinciOS.jobs.run({
            allQueues,
            limit,
            queue
        });
        return {
            DaVinciOS
        };
    }
    if (script === 'jobs:handle-schedules') {
        const DaVinciOS = await getDaVinciOS({
            config
        }) // Do not setup crons here - this bin script can set up its own crons
        ;
        const queue = args.queue ? args.queue : undefined;
        const allQueues = !!args['all-queues'];
        await DaVinciOS.jobs.handleSchedules({
            allQueues,
            queue
        });
        return {
            DaVinciOS
        };
    }
    if (script === 'generate:db-schema') {
        // Barebones instance to access database adapter, without connecting to the DB
        const DaVinciOS = await getDaVinciOS({
            config,
            disableDBConnect: true,
            disableOnInit: true
        }) // Do not setup crons here
        ;
        if (typeof DaVinciOS.db.generateSchema !== 'function') {
            DaVinciOS.logger.error({
                msg: `${DaVinciOS.db.packageName} does not support database schema generation`
            });
            await DaVinciOS.destroy();
            process.exit(1);
        }
        await DaVinciOS.db.generateSchema({
            log: args.log === 'false' ? false : true,
            prettify: args.prettify === 'false' ? false : true
        });
        return {
            DaVinciOS
        };
    }
    console.error(script ? `Unknown command: "${script}"` : 'Please provide a command to run');
    console.log(`\nAvailable commands:\n${availableScripts.map((c)=>`  - ${c}`).join('\n')}`);
    process.exit(1);
}

//# sourceMappingURL=index.js.map
