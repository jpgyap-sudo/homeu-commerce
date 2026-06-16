'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface DeleteProductButtonProps {
  productId: number
  productTitle: string
}

export function DeleteProductButton({ productId, productTitle }: DeleteProductButtonProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${productTitle}"? This action cannot be undone.`)) {
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete product')
      }

      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to delete product')
      setDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      style={{
        color: deleting ? '#999' : '#b42318',
        fontSize: 13,
        background: 'none',
        border: 'none',
        cursor: deleting ? 'not-allowed' : 'pointer',
        padding: 0,
        textDecoration: 'underline',
      }}
    >
      {deleting ? 'Deleting...' : 'Delete'}
    </button>
  )
}
