import fs from 'fs';
import { writeMigrationIndex } from '../../index.js';
import { migrationTemplate } from './migrationTemplate.js';
export const createMigration = function createMigration({ migrationName, DaVinciOS }) {
    const dir = DaVinciOS.db.migrationDir;
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    const [yyymmdd, hhmmss] = new Date().toISOString().split('T');
    const formattedDate = yyymmdd.replace(/\D/g, '');
    const formattedTime = hhmmss.split('.')[0].replace(/\D/g, '');
    const timestamp = `${formattedDate}_${formattedTime}`;
    const formattedName = migrationName.replace(/\W/g, '_');
    const fileName = `${timestamp}_${formattedName}.ts`;
    const filePath = `${dir}/${fileName}`;
    fs.writeFileSync(filePath, migrationTemplate);
    writeMigrationIndex({
        migrationsDir: DaVinciOS.db.migrationDir
    });
    DaVinciOS.logger.info({
        msg: `Migration created at ${filePath}`
    });
};

//# sourceMappingURL=createMigration.js.map
