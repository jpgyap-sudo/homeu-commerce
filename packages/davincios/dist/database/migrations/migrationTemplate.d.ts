export declare const migrationTemplate = "\nimport {\n  MigrateUpArgs,\n  MigrateDownArgs,\n} from \"@DaVinciOScms/db-mongodb\";\n\nexport async function up({ DaVinciOS, req }: MigrateUpArgs): Promise<void> {\n  // Migration code\n};\n\nexport async function down({ DaVinciOS, req }: MigrateDownArgs): Promise<void> {\n  // Migration code\n};\n";
//# sourceMappingURL=migrationTemplate.d.ts.map
