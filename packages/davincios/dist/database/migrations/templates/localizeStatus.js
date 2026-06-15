/**
 * Template for localizeStatus migration
 * Transforms version._status from single value to per-locale object
 */ export const localizeStatusTemplate = (options)=>{
    const { collectionSlug, dbType, globalSlug } = options;
    const entity = collectionSlug ? `collectionSlug: '${collectionSlug}'` : `globalSlug: '${globalSlug}'`;
    if (dbType === 'mongodb') {
        return `import { MigrateUpArgs, MigrateDownArgs } from '@davincios/db-mongodb'
import { localizeStatus } from 'DaVinciOS'

export async function up({ DaVinciOS, req }: MigrateUpArgs): Promise<void> {
  await localizeStatus.up({
    ${entity},
    DaVinciOS,
    req,
  })
}

export async function down({ DaVinciOS, req }: MigrateDownArgs): Promise<void> {
  await localizeStatus.down({
    ${entity},
    DaVinciOS,
    req,
  })
}
`;
    }
    // SQL databases (Postgres, SQLite)
    return `import { MigrateUpArgs, MigrateDownArgs, sql } from '@davincios/db-${dbType}'
import { localizeStatus } from 'DaVinciOS'

export async function up({ db, DaVinciOS, req }: MigrateUpArgs): Promise<void> {
  await localizeStatus.up({
    ${entity},
    db,
    DaVinciOS,
    req,
    sql,
  })
}

export async function down({ db, DaVinciOS, req }: MigrateDownArgs): Promise<void> {
  await localizeStatus.down({
    ${entity},
    db,
    DaVinciOS,
    req,
    sql,
  })
}
`;
};

//# sourceMappingURL=localizeStatus.js.map
