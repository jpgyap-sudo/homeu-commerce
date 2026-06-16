import config from '@DaVinciOS-config'
import '@davincios/next/css'
import './admin-theme.css'
import type { ServerFunctionClient } from '@davincios/cms'
import { handleServerFunctions, AdminLayout } from '@davincios/next/layouts'
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
  <AdminLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </AdminLayout>
)

export default Layout
