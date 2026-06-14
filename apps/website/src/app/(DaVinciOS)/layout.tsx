import config from '@DaVinciOS-config'
import '@DaVinciOScms/next/css'
import './admin-theme.css'
import type { ServerFunctionClient } from 'DaVinciOS'
import { handleServerFunctions, RootLayout } from '@DaVinciOScms/next/layouts'
import React from 'react'
import { importMap } from './admin/importMap'

type Args = {
  children: React.ReactNode
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
)

export default Layout
