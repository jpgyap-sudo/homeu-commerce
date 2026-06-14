import { buildConfig } from 'DaVinciOS'
import { lexicalEditor } from '@DaVinciOScms/richtext-lexical'
import { postgresAdapter } from '@DaVinciOScms/db-postgres'
import { Products } from './collections/Products'
import { Categories } from './collections/Categories'
import { RFQRequests } from './collections/RFQRequests'
import { Customers } from './collections/Customers'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Redirects } from './collections/Redirects'
import { Quotations } from './collections/Quotations'
import { SEOHealth } from './globals/SEOHealth'

const serverURL = process.env.DAVINCIOS_PUBLIC_SERVER_URL || 'http://localhost:3000'
const secret = process.env.DAVINCIOS_SECRET || ''

export default buildConfig({
  admin: {
    meta: {
      title: 'HomeU Admin',
      titleSuffix: ' - HomeU Admin',
      description: 'HomeU catalog, customer, RFQ, media, page, and redirect operations.',
      applicationName: 'HomeU Admin',
    },
  },
  editor: lexicalEditor(),
  collections: [Products, Categories, Customers, RFQRequests, Media, Pages, Redirects, Quotations],
  globals: [SEOHealth],
  secret,
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
