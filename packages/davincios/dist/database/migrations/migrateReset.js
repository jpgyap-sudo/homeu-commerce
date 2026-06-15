import { commitTransaction } from '../../utilities/commitTransaction.js';
import { createLocalReq } from '../../utilities/createLocalReq.js';
import { initTransaction } from '../../utilities/initTransaction.js';
import { killTransaction } from '../../utilities/killTransaction.js';
import { getMigrations } from './getMigrations.js';
import { readMigrationFiles } from './readMigrationFiles.js';
export async function migrateReset() {
    const { DaVinciOS } = this;
    const migrationFiles = await readMigrationFiles({
        DaVinciOS
    });
    const { existingMigrations } = await getMigrations({
        DaVinciOS
    });
    if (!existingMigrations?.length) {
        DaVinciOS.logger.info({
            msg: 'No migrations to reset.'
        });
        return;
    }
    const req = await createLocalReq({}, DaVinciOS);
    migrationFiles.reverse();
    // Rollback all migrations in order
    for (const migration of migrationFiles){
        // Create or update migration in database
        const existingMigration = existingMigrations.find((existing)=>existing.name === migration.name);
        if (existingMigration) {
            DaVinciOS.logger.info({
                msg: `Migrating down: ${migration.name}`
            });
            try {
                const start = Date.now();
                await initTransaction(req);
                const session = DaVinciOS.db.sessions?.[await req.transactionID];
                await migration.down({
                    DaVinciOS,
                    req,
                    session
                });
                await DaVinciOS.delete({
                    collection: 'DaVinciOS-migrations',
                    req,
                    where: {
                        id: {
                            equals: existingMigration.id
                        }
                    }
                });
                await commitTransaction(req);
                DaVinciOS.logger.info({
                    msg: `Migrated down:  ${migration.name} (${Date.now() - start}ms)`
                });
            } catch (err) {
                await killTransaction(req);
                DaVinciOS.logger.error({
                    err,
                    msg: `Error running migration ${migration.name}`
                });
                throw err;
            }
        }
    }
    // Delete dev migration
    try {
        await DaVinciOS.delete({
            collection: 'DaVinciOS-migrations',
            where: {
                batch: {
                    equals: -1
                }
            }
        });
    } catch (err) {
        DaVinciOS.logger.error({
            err,
            msg: 'Error deleting dev migration'
        });
    }
}

//# sourceMappingURL=migrateReset.js.map
