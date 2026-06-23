import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CollectionEditor, { type CollectionData } from '../CollectionEditor'

export const metadata = { title: 'New collection — DaVinciOS' }

export default async function NewCollectionPage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  const initial: CollectionData = {
    title: '', description: '', imageUrl: '', bannerImageUrl: '',
    bannerFocalX: 50, bannerFocalY: 50, bannerImageScale: 100,
    type: 'manual', rules: [], rulesMatch: 'all',
    published: true, featured: false, position: 0, productSort: 'manual',
    seoTitle: '', seoDescription: '', products: [],
  }
  return <CollectionEditor initial={initial} />
}
