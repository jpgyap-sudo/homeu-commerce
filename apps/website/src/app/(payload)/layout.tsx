import type { Metadata } from 'next'
import { RootLayout } from '@payloadcms/next/layouts'
import type { LayoutServerProps } from 'payload'

export const metadata: Metadata = {
  title: 'HomeU Admin',
  description: 'HomeU Commerce Administration Panel',
  robots: 'noindex,nofollow',
}

export default function PayloadLayout({ children, params }: LayoutServerProps) {
  return RootLayout({ children, params })
}
