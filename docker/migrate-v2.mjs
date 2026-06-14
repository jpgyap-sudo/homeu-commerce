#!/usr/bin/env node
// Bypass the CJS/ESM loader chain issue by using Payload's getPayload()
// which initializes the full application and triggers auto-migration

process.env.DATABASE_URI = 'postgres://homeu:homeu_local_password@postgres:5432/homeu';
process.env.PAYLOAD_SECRET = 'homeu-commerce-payload-secret-2026';
process.env.PAYLOAD_PUBLIC_SERVER_URL = 'https://admin.homeu.ph';
process.env.NODE_ENV = 'production';
process.env.PAYLOAD_CONFIG_PATH = './src/payload.config.ts';
process.env.PAYLOAD_DISABLE_ADMIN = 'true';

async function main() {
  // Dynamic import to get Payload's initialize function
  // This avoids the CJS require() chain entirely
  const { getPayload } = await import('payload');
  
  // Use dynamic import for config to avoid tsx transpile issues
  const configPath = new URL('./src/payload.config.ts', new URL('file:///app/website/'));
  const configModule = await import(configPath.href);
  const config = configModule.default || configModule;
  
  console.log('Initializing Payload to trigger auto-migration...');
  
  const payload = await getPayload({
    config: config,
  });
  
  console.log('Payload initialized successfully!');
  console.log('Schema should now be migrated.');
  
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
