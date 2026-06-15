import { commitTransaction } from '../../utilities/commitTransaction.js';
import { createLocalReq } from '../../utilities/createLocalReq.js';
import { initTransaction } from '../../utilities/initTransaction.js';
import { killTransaction } from '../../utilities/killTransaction.js';
import { getMigrations } from './getMigrations.js';
import { readMigrationFiles } from './readMigrationFiles.js';
export async function migrateDown() {
    const { DaVinciOS } = this;
    const migrationFiles = await readMigrationFiles({
        DaVinciOS
    });
    const { existingMigrations, latestBatch } = await getMigrations({
        DaVinciOS
    });
    if (!existingMigrations?.length) {
        DaVinciOS.logger.info({
            msg: 'No migrations to rollback.'
        });
        return;
    }
    DaVinciOS.logger.info({
        msg: `Rolling back batch ${latestBatch} consisting of ${existingMigrations.length} migration(s).`
    });
    const latestBatchMigrations = existingMigrations.filter(({ batch })=>batch === latestBatch);
    for (const migration of latestBatchMigrations){
        const migrationFile = migrationFiles.find((m)=>m.name === migration.name);
        if (!migrationFile) {
            throw new Error(`Migration ${migration.name} not found locally.`);
        }
        const start = Date.now();
        const req = await createLocalReq({}, DaVinciOS);
        try {
            DaVinciOS.logger.info({
                msg: `Migrating down: ${migrationFile.name}`
            });
            await initTransaction(req);
            const session = DaVinciOS.db.sessions?.[await req.transactionID];
            await migrationFile.down({
                DaVinciOS,
                req,
                session
            });
            DaVinciOS.logger.info({
                msg: `Migrated down:  ${migrationFile.name} (${Date.now() - start}ms)`
            });
            // Waiting for implementation here
            await DaVinciOS.delete({
                id: migration.id,
                collection: 'DaVinciOS-migrations',
                req
            });
            await commitTransaction(req);
        } catch (err) {
            await killTransaction(req);
            DaVinciOS.logger.error({
                err,
                msg: `Error running migration ${migrationFile.name}`
            });
            process.exit(1);
        }
    }
}

//# sourceMappingURL=migrateDown.js.map
