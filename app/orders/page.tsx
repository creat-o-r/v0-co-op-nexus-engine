import { Metadata } from 'next'
import { OrdersPageClient } from '@/components/orders/orders-page-client'

export const metadata: Metadata = {
  title: 'Orders | Co-op Nexus',
  description: 'Manage your orders, needs, and offers',
}

export default function OrdersPage() {
  return <OrdersPageClient />
}
