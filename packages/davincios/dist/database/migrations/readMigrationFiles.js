import fs from 'fs';
import path from 'path';
import { dynamicImport } from '../../utilities/dynamicImport.js';
/**
 * Read the migration files from disk
 */ export const readMigrationFiles = async ({ DaVinciOS })=>{
    if (!fs.existsSync(DaVinciOS.db.migrationDir)) {
        DaVinciOS.logger.error({
            msg: `No migration directory found at ${DaVinciOS.db.migrationDir}`
        });
        return [];
    }
    DaVinciOS.logger.info({
        msg: `Reading migration files from ${DaVinciOS.db.migrationDir}`
    });
    const files = fs.readdirSync(DaVinciOS.db.migrationDir).sort().filter((f)=>{
        return (f.endsWith('.ts') || f.endsWith('.js')) && f !== 'index.js' && f !== 'index.ts';
    }).map((file)=>{
        return path.resolve(DaVinciOS.db.migrationDir, file);
    });
    return Promise.all(files.map(async (filePath)=>{
        const migrationModule = await dynamicImport(filePath);
        const migration = 'default' in migrationModule ? migrationModule.default : migrationModule;
        const result = {
            name: path.basename(filePath).split('.')[0],
            down: migration.down,
            up: migration.up
        };
        return result;
    }));
};

//# sourceMappingURL=readMigrationFiles.js.map
