import Sidebar from '@/components/layout/Sidebar'
import TopNav from '@/components/layout/TopNav'
import QuickAddFAB from '@/components/shared/QuickAddFAB'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">
      <Sidebar />
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ marginLeft: 'var(--sidebar-width)' }}
      >
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <QuickAddFAB />
    </div>
  )
}
