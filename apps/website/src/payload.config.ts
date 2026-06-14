import { buildConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { Products } from './collections/Products'
import { Categories } from './collections/Categories'
import { RFQRequests } from './collections/RFQRequests'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'

export default buildConfig({
  admin: { user: 'users' },
  editor: lexicalEditor(),
  collections: [Products, Categories, RFQRequests, Media, Pages],
  secret: process.env.PAYLOAD_SECRET || '',
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
})
