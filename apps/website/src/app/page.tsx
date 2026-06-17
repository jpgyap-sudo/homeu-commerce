import { getHomepageSections } from '@/lib/theme'
import { HomeSections } from '@/components/home/HomeSections'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const sections = await getHomepageSections()
  return <HomeSections sections={sections} />
}
