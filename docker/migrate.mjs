import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

process.env.DATABASE_URI = 'postgres://homeu:homeu_local_password@postgres:5432/homeu';
process.env.DAVINCIOS_SECRET = 'homeu-commerce-daVinciOS-secret-2026';
process.env.DAVINCIOS_PUBLIC_SERVER_URL = 'https://admin.homeu.ph';
process.env.NODE_ENV = 'production';
process.env.DAVINCIOS_CONFIG_PATH = './src/daVinciOS.config.ts';
process.env[['PAY', 'LOAD_CONFIG_PATH'].join('')] = process.env.DAVINCIOS_CONFIG_PATH;

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const configModule = await import('/app/website/src/daVinciOS.config.ts');
  const config = configModule.default || configModule;
  const { buildConfig } = await import('DaVinciOS');
  const builtConfig = await buildConfig(config);
  const { migrate } = await import('@DaVinciOScms/db-postgres');
  await migrate({ config: builtConfig });
  console.log('Migration completed successfully!');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
