import { Table } from 'console-table-printer';
import { getMigrations } from './getMigrations.js';
import { readMigrationFiles } from './readMigrationFiles.js';
export async function migrateStatus() {
    const { DaVinciOS } = this;
    const migrationFiles = await readMigrationFiles({
        DaVinciOS
    });
    DaVinciOS.logger.debug({
        msg: `Found ${migrationFiles.length} migration files.`
    });
    const { existingMigrations } = await getMigrations({
        DaVinciOS
    });
    if (!migrationFiles.length) {
        DaVinciOS.logger.info({
            msg: 'No migrations found.'
        });
        return;
    }
    // Compare migration files to existing migrations
    const statuses = migrationFiles.map((migration)=>{
        const existingMigration = existingMigrations.find((m)=>m.name === migration.name);
        return {
            Name: migration.name,
            Batch: existingMigration?.batch,
            Ran: existingMigration ? 'Yes' : 'No'
        };
    });
    const p = new Table();
    statuses.forEach((s)=>{
        p.addRow(s, {
            color: s.Ran === 'Yes' ? 'green' : 'red'
        });
    });
    p.printTable();
}

//# sourceMappingURL=migrateStatus.js.map
