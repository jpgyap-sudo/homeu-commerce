import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

process.env.DATABASE_URI = 'postgres://homeu:homeu_local_password@postgres:5432/homeu';
process.env.PAYLOAD_SECRET = 'homeu-commerce-payload-secret-2026';
process.env.PAYLOAD_PUBLIC_SERVER_URL = 'https://admin.homeu.ph';
process.env.NODE_ENV = 'production';
process.env.PAYLOAD_CONFIG_PATH = './src/payload.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const configModule = await import('/app/website/src/payload.config.ts');
  const config = configModule.default || configModule;
  const { buildConfig } = await import('payload');
  const builtConfig = await buildConfig(config);
  const { migrate } = await import('@payloadcms/db-postgres');
  await migrate({ config: builtConfig });
  console.log('Migration completed successfully!');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
