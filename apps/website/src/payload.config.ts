import { buildConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { Products } from './collections/Products'
import { Categories } from './collections/Categories'
import { RFQRequests } from './collections/RFQRequests'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'

const serverURL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'

export default buildConfig({
  admin: {
    user: 'users',
    // Restrict admin access by IP or domain if needed
    meta: {
      titleSuffix: ' - HomeU Admin',
    },
  },
  editor: lexicalEditor(),
  collections: [Products, Categories, RFQRequests, Media, Pages],
  secret: process.env.PAYLOAD_SECRET || '',
  // Security: restrict CORS and CSRF to known domains only
  cors: [
    serverURL,
    'https://store.homeu.ph',
    'https://admin.homeu.ph',
  ],
  csrf: [
    serverURL,
    'https://store.homeu.ph',
    'https://admin.homeu.ph',
  ],
  // Security: cookie configuration for admin auth
  cookiePrefix: 'homeu',
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
      // Connection pool security
      max: 10,
      idleTimeoutMillis: 30000,
    },
  }),
})
