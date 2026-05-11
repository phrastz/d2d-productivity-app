'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Routine, RoutineOccurrence, RoutineChecklistItem, RoutineOccurrenceCheck } from '@/types'

export interface OccurrenceWithChecks extends RoutineOccurrence {
  checks: RoutineOccurrenceCheck[]
}

export function useRoutineDetail(routineId: string | null) {
  const supabase = createClient()
  const [routine, setRoutine] = useState<Routine | null>(null)
  const [occurrences, setOccurrences] = useState<OccurrenceWithChecks[]>([])
  const [checklistItems, setChecklistItems] = useState<RoutineChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!routineId) { setLoading(false); return }
    setLoading(true)
    try {
      const [{ data: rData, error: rErr }, { data: occData }, { data: cliData }, { data: chkData }] = await Promise.all([
        supabase.from('routines').select('*').eq('id', routineId).single(),
        supabase.from('routine_occurrences').select('*').eq('routine_id', routineId).order('due_date', { ascending: false }),
        supabase.from('routine_checklist_items').select('*').eq('routine_id', routineId).order('sort_order'),
        supabase.from('routine_occurrence_checks').select('*'),
      ])
      if (rErr) throw rErr
      setRoutine(rData as Routine)
      setChecklistItems((cliData ?? []) as RoutineChecklistItem[])
      const checks = (chkData ?? []) as RoutineOccurrenceCheck[]
      const enrichedOccs: OccurrenceWithChecks[] = ((occData ?? []) as RoutineOccurrence[]).map(occ => ({
        ...occ,
        checks: checks.filter(c => c.occurrence_id === occ.id),
      }))
      setOccurrences(enrichedOccs)
    } catch (err: any) {
      setError(err.message ?? 'Failed to load routine')
    } finally {
      setLoading(false)
    }
  }, [routineId])

  useEffect(() => {
    fetchAll()
    if (!routineId) return
    const channel = supabase.channel(`routine-detail-${routineId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'routines', filter: `id=eq.${routineId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'routine_occurrences', filter: `routine_id=eq.${routineId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'routine_checklist_items', filter: `routine_id=eq.${routineId}` }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [routineId, fetchAll])

  const toggleCheck = async (occurrenceId: string, itemId: string, current: boolean) => {
    const existing = occurrences.flatMap(o => o.checks).find(c => c.occurrence_id === occurrenceId && c.checklist_item_id === itemId)
    if (existing) {
      await supabase.from('routine_occurrence_checks').update({
        is_checked: !current,
        checked_at: !current ? new Date().toISOString() : null,
      }).eq('id', existing.id)
    } else {
      await supabase.from('routine_occurrence_checks').insert({
        occurrence_id: occurrenceId,
        checklist_item_id: itemId,
        is_checked: true,
        checked_at: new Date().toISOString(),
      })
    }
    fetchAll()
  }

  const addChecklistItem = async (label: string) => {
    if (!routineId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('routine_checklist_items').insert({
      routine_id: routineId,
      owner_id: user.id,
      label,
      sort_order: checklistItems.length,
    })
    fetchAll()
  }

  const deleteChecklistItem = async (id: string) => {
    await supabase.from('routine_checklist_items').delete().eq('id', id)
    fetchAll()
  }

  const updateRoutine = async (patch: Partial<Routine>) => {
    if (!routineId) return
    await supabase.from('routines').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', routineId)
    fetchAll()
  }

  const resolveOccurrence = async (occurrenceId: string, status: 'completed' | 'delayed', delayReason?: string) => {
    const patch: any = { status }
    if (status === 'completed') patch.completed_at = new Date().toISOString()
    if (status === 'delayed' && delayReason) patch.delay_reason = delayReason
    await supabase.from('routine_occurrence_checks').update(patch).eq('id', occurrenceId)
    fetchAll()
  }

  const markOccurrenceDone = async (occurrenceId: string) => {
    await supabase.from('routine_occurrences').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', occurrenceId)
    fetchAll()
  }

  const markOccurrenceDelayed = async (occurrenceId: string, reason: string, newExpected?: string) => {
    await supabase.from('routine_occurrences').update({ status: 'delayed', delay_reason: reason }).eq('id', occurrenceId)
    fetchAll()
  }

  return {
    routine, occurrences, checklistItems, loading, error,
    toggleCheck, addChecklistItem, deleteChecklistItem,
    updateRoutine, markOccurrenceDone, markOccurrenceDelayed, fetchAll,
  }
}
