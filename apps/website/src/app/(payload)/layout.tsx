import type { Metadata } from 'next'
import { RootLayout } from '@payloadcms/next/layouts'

export const metadata: Metadata = {
  title: 'HomeU Admin',
  description: 'HomeU Commerce Administration Panel',
  robots: 'noindex,nofollow',
}

export default function PayloadLayout({ children, params }: any) {
  return RootLayout({ children, params })
}
