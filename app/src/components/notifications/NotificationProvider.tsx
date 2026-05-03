'use client'

import { useNotificationChecker } from '@/hooks/useNotificationChecker'
import { useDailySummary } from '@/hooks/useDailySummary'

export function NotificationProvider() {
  useNotificationChecker()
  useDailySummary()
  
  return null
}
