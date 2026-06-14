#!/usr/bin/env node
/**
 * URL Mapper – 301 Redirect Generator
 * 
 * Reads Shopify export data and generates 301 redirect rules
 * from old Shopify URLs to new Next.js routes.
 * 
 * Usage: node tools/url-mapper/redirect-generator.mjs
 */

import fs from 'fs'
import path from 'path'
import process from 'process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXPORT_PATH = path.join(__dirname, '..', 'shopify-import', 'output', 'shopify-api', 'shopify-export.json')
const OUTPUT_PATH = path.join(__dirname, 'redirects.json')

// Load Shopify export data
const exportData = JSON.parse(fs.readFileSync(EXPORT_PATH, 'utf8'))

const { store, products, pages, collections, blogs } = exportData

// Build URL mappings
const redirectMap = new Map()

// 1. Product URLs
products.forEach(product => {
  const oldUrl = `https://${store}/products/${product.handle}`
  const newUrl = `/products/${product.slug || product.handle}`
  redirectMap.set(oldUrl, newUrl)
})

// 2. Collection URLs
collections.forEach(collection => {
  const oldUrl = `https://${store}/collections/${collection.handle}`
  const newUrl = `/collections/${collection.handle}`
  redirectMap.set(oldUrl, newUrl)
})

// 3. Page URLs
pages.forEach(page => {
  const oldUrl = `https://${store}/pages/${page.handle}`
  const newUrl = `/pages/${page.handle}`
  redirectMap.set(oldUrl, newUrl)
})

// 4. Blog URLs
blogs.forEach(blog => {
  blog.articles.forEach(article => {
    const oldUrl = `https://${store}/blogs/${blog.handle}/${article.handle}`
    const newUrl = `/blog/${blog.handle}/${article.handle}`
    redirectMap.set(oldUrl, newUrl)
})

// 5. Policy URLs (Shopify maps policies to pages)
const policyMap = {
  'refund-policy': '/pages/refund-policy',
  'privacy-policy': '/pages/privacy-policy',
  'terms-of-service': '/pages/terms-of-service'
}

Object.entries(policyMap).forEach(([handle, newPath]) => {
  const oldUrl = `https://${store}/policies/${handle}`
  redirectMap.set(oldUrl, newPath)
})

// Output JSON
const output = JSON.stringify(Object.fromEntries(redirectMap), null, 2)
fs.writeFileSync(OUTPUT_PATH, output)

console.log(`✅ Generated ${redirectMap.size} redirect rules`)
console.log(`📁 Output saved to ${OUTPUT_PATH}`)