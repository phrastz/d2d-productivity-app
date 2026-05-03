import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import QuickAddFAB from '@/components/shared/QuickAddFAB'
import { NotificationProvider } from '@/components/notifications/NotificationProvider'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">
      <NotificationProvider />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden w-full md:ml-[var(--sidebar-width)]">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
      <QuickAddFAB />
    </div>
  )
}
