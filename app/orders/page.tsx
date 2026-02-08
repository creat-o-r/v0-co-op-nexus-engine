import { Metadata } from 'next'
import { Suspense } from 'react'
import { OrdersPageClient } from '@/components/orders/orders-page-client'

export const metadata: Metadata = {
  title: 'Orders | Co-op Nexus',
  description: 'Manage your orders, needs, and offers',
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <OrdersPageClient />
    </Suspense>
  )
}
