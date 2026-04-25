import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'D2D Tracking — Notion + TickTick Productivity',
  description: 'Your all-in-one productivity hub: project planning, daily tasks, habits, and reports.',
  keywords: 'productivity, project management, tasks, habits, planning',
  authors: [{ name: 'D2D Team' }],
  openGraph: {
    title: 'D2D Tracking',
    description: 'Plan projects, track tasks, build habits.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  )
}
