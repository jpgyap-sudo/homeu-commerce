export const migrationTemplate = `
import {
  MigrateUpArgs,
  MigrateDownArgs,
} from "@davincios/db-mongodb";

export async function up({ DaVinciOS, req }: MigrateUpArgs): Promise<void> {
  // Migration code
};

export async function down({ DaVinciOS, req }: MigrateDownArgs): Promise<void> {
  // Migration code
};
`;

//# sourceMappingURL=migrationTemplate.js.map
