import type { AdminViewServerProps } from 'payload'
import { RootPage } from '@payloadcms/next/views'

export default function AdminPage({ params, searchParams }: AdminViewServerProps) {
  return RootPage({ params, searchParams })
}
