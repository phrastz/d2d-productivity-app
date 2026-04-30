import type { Metadata, Viewport } from 'next'
import { Inter, Geist } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const viewport: Viewport = {
  themeColor: '#0f1322',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'D2D Tracking — Notion + TickTick Productivity',
  description: 'Your all-in-one productivity hub: project planning, daily tasks, habits, and reports.',
  keywords: 'productivity, project management, tasks, habits, planning',
  authors: [{ name: 'D2D Team' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'D2D Tracking',
  },
  icons: {
    apple: '/icons/icon-192x192.png',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'D2D Tracking',
    description: 'Plan projects, track tasks, build habits.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  )
}
