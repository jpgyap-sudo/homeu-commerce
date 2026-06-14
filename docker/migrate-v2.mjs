#!/usr/bin/env node
// Bypass the CJS/ESM loader chain issue by using DaVinciOS's getDaVinciOS()
// which initializes the full application and triggers auto-migration

process.env.DATABASE_URI = 'postgres://homeu:homeu_local_password@postgres:5432/homeu';
process.env.PAYLOAD_SECRET = 'homeu-commerce-DaVinciOS-secret-2026';
process.env.PAYLOAD_PUBLIC_SERVER_URL = 'https://admin.homeu.ph';
process.env.NODE_ENV = 'production';
process.env.PAYLOAD_CONFIG_PATH = './src/DaVinciOS.config.ts';
process.env.PAYLOAD_DISABLE_ADMIN = 'true';

async function main() {
  // Dynamic import to get DaVinciOS's initialize function
  // This avoids the CJS require() chain entirely
  const { getDaVinciOS } = await import('DaVinciOS');
  
  // Use dynamic import for config to avoid tsx transpile issues
  const configPath = new URL('./src/DaVinciOS.config.ts', new URL('file:///app/website/'));
  const configModule = await import(configPath.href);
  const config = configModule.default || configModule;
  
  console.log('Initializing DaVinciOS to trigger auto-migration...');
  
  const DaVinciOS = await getDaVinciOS({
    config: config,
  });
  
  console.log('DaVinciOS initialized successfully!');
  console.log('Schema should now be migrated.');
  
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
