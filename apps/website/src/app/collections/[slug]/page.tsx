import { redirect } from 'next/navigation'

export default async function CollectionSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  redirect(`/products?category=${slug}`)
}
