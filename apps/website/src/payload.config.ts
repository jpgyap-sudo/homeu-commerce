import { buildConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { Products } from './collections/Products'
import { Categories } from './collections/Categories'
import { RFQRequests } from './collections/RFQRequests'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'

export default buildConfig({
  admin: { user: 'users' },
  editor: lexicalEditor(),
  collections: [Products, Categories, RFQRequests, Media, Pages]
})
