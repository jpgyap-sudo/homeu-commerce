'use client'

export type QuoteItem = {
  productId: string
  title: string
  sku?: string
  price?: number
  quantity: number
}

export function getQuoteCart(): QuoteItem[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem('homeu_quote_cart')
  return raw ? JSON.parse(raw) : []
}

export function saveQuoteCart(items: QuoteItem[]) {
  localStorage.setItem('homeu_quote_cart', JSON.stringify(items))
}

export function addToQuoteCart(item: QuoteItem) {
  const items = getQuoteCart()
  const existing = items.find((i) => i.productId === item.productId)
  if (existing) existing.quantity += item.quantity
  else items.push(item)
  saveQuoteCart(items)
}
