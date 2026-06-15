import { commitTransaction } from '../../utilities/commitTransaction.js';
import { createLocalReq } from '../../utilities/createLocalReq.js';
import { initTransaction } from '../../utilities/initTransaction.js';
import { killTransaction } from '../../utilities/killTransaction.js';
import { getMigrations } from './getMigrations.js';
import { readMigrationFiles } from './readMigrationFiles.js';
/**
 * Run all migration down functions before running up
 */ export async function migrateRefresh() {
    const { DaVinciOS } = this;
    const migrationFiles = await readMigrationFiles({
        DaVinciOS
    });
    const { existingMigrations } = await getMigrations({
        DaVinciOS
    });
    const req = await createLocalReq({}, DaVinciOS);
    if (existingMigrations?.length) {
        DaVinciOS.logger.info({
            msg: `Rolling back all ${existingMigrations.length} migration(s).`
        });
        // Reverse order of migrations to rollback
        existingMigrations.reverse();
        for (const migration of existingMigrations){
            try {
                const migrationFile = migrationFiles.find((m)=>m.name === migration.name);
                if (!migrationFile) {
                    throw new Error(`Migration ${migration.name} not found locally.`);
                }
                DaVinciOS.logger.info({
                    msg: `Migrating down: ${migration.name}`
                });
                const start = Date.now();
                await initTransaction(req);
                const session = DaVinciOS.db.sessions?.[await req.transactionID];
                await migrationFile.down({
                    DaVinciOS,
                    req,
                    session
                });
                DaVinciOS.logger.info({
                    msg: `Migrated down:  ${migration.name} (${Date.now() - start}ms)`
                });
                await DaVinciOS.delete({
                    collection: 'DaVinciOS-migrations',
                    req,
                    where: {
                        name: {
                            equals: migration.name
                        }
                    }
                });
            } catch (err) {
                await killTransaction(req);
                let msg = `Error running migration ${migration.name}. Rolling back.`;
                if (err instanceof Error) {
                    msg += ` ${err.message}`;
                }
                DaVinciOS.logger.error({
                    err,
                    msg
                });
                process.exit(1);
            }
        }
    } else {
        DaVinciOS.logger.info({
            msg: 'No migrations to rollback.'
        });
    }
    // Run all migrate up
    for (const migration of migrationFiles){
        DaVinciOS.logger.info({
            msg: `Migrating: ${migration.name}`
        });
        try {
            const start = Date.now();
            await initTransaction(req);
            await migration.up({
                DaVinciOS,
                req
            });
            await DaVinciOS.create({
                collection: 'DaVinciOS-migrations',
                data: {
                    name: migration.name,
                    executed: true
                },
                req
            });
            await commitTransaction(req);
            DaVinciOS.logger.info({
                msg: `Migrated:  ${migration.name} (${Date.now() - start}ms)`
            });
        } catch (err) {
            await killTransaction(req);
            let msg = `Error running migration ${migration.name}. Rolling back.`;
            if (err instanceof Error) {
                msg += ` ${err.message}`;
            }
            DaVinciOS.logger.error({
                err,
                msg
            });
            process.exit(1);
        }
    }
}

//# sourceMappingURL=migrateRefresh.js.map
