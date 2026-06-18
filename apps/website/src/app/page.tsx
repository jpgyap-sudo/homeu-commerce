import { getHomepageSections } from '@/lib/theme'
import { HomeSections } from '@/components/home/HomeSections'

export const dynamic = 'force-dynamic'

export default async function HomePage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const sp = await searchParams
  const sections = await getHomepageSections()
  return <HomeSections sections={sections} preview={sp.preview !== undefined} />
}
