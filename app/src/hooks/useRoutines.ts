'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Routine, RoutineOccurrence } from '@/types'
import { computeNextDueDate } from '@/lib/routineUtils'
import { format } from 'date-fns'

export interface RoutineWithLatestOccurrence extends Routine {
  latestOccurrence?: RoutineOccurrence | null
  overdueCount?: number
}

export function useRoutines() {
  const supabase = createClient()
  const [routines, setRoutines] = useState<RoutineWithLatestOccurrence[]>([])
  const [loading, setLoading] = useState(true)
  const [overdueCount, setOverdueCount] = useState(0)

  const fetchRoutines = useCallback(async () => {
    setLoading(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setLoading(false); return }

      const today = format(new Date(), 'yyyy-MM-dd')

      const [{ data: routinesData, error: rErr }, { data: occData, error: oErr }] = await Promise.all([
        sb.from('routines').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
        sb.from('routine_occurrences').select('*').eq('owner_id', user.id).order('due_date', { ascending: false }),
      ])

      if (rErr) { console.error('[useRoutines] fetchRoutines routines error:', rErr); setLoading(false); return }
      if (oErr) console.error('[useRoutines] fetchRoutines occurrences error:', oErr)

      if (!routinesData) { setLoading(false); return }

      const occurrences: RoutineOccurrence[] = occData ?? []

      const enriched: RoutineWithLatestOccurrence[] = routinesData.map(r => {
        const routineOccs = occurrences.filter(o => o.routine_id === r.id)
        const latestOccurrence = routineOccs[0] ?? null
        const overdueCount = routineOccs.filter(o => o.status === 'pending' && o.due_date < today).length
        return { ...r, latestOccurrence, overdueCount }
      })

      const totalOverdue = enriched.reduce((sum, r) => sum + (r.overdueCount ?? 0), 0)
      setRoutines(enriched)
      setOverdueCount(totalOverdue)
    } catch (err) {
      console.error('[useRoutines] fetchRoutines unexpected error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRoutines()
    const channel = supabase.channel('routines-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'routines' }, fetchRoutines)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'routine_occurrences' }, fetchRoutines)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchRoutines])

  const createRoutine = async (payload: Omit<Routine, 'id' | 'owner_id' | 'created_at' | 'updated_at'>, checklistLabels: string[]) => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: routine, error } = await sb.from('routines').insert({
      ...payload,
      owner_id: user.id,
    }).select().single()
    if (error) {
      console.error('[useRoutines] createRoutine insert error:', error)
      throw error
    }

    const nonFatalInserts: PromiseLike<unknown>[] = []

    if (checklistLabels.length > 0) {
      nonFatalInserts.push(
        sb.from('routine_checklist_items').insert(
          checklistLabels.map((label, i) => ({
            routine_id: routine.id,
            owner_id: user.id,
            label,
            sort_order: i,
          }))
        ).then(({ error: e }) => {
          if (e) console.error('[useRoutines] checklist insert error:', e)
        })
      )
    }

    if (routine.next_due_date) {
      nonFatalInserts.push(
        sb.from('routine_occurrences').insert({
          routine_id: routine.id,
          owner_id: user.id,
          due_date: routine.next_due_date,
          status: 'pending',
        }).then(({ error: e }) => {
          if (e) console.error('[useRoutines] occurrence insert error:', e)
        })
      )
    }

    await Promise.all(nonFatalInserts)
    await fetchRoutines()
    return routine as Routine
  }

  const markDone = async (routineId: string, occurrenceId: string) => {
    const sb = createClient()
    const now = new Date().toISOString()

    const { error: occErr } = await sb.from('routine_occurrences').update({
      status: 'completed',
      completed_at: now,
    }).eq('id', occurrenceId)
    if (occErr) console.error('[useRoutines] markDone update occurrence error:', occErr)

    const routine = routines.find(r => r.id === routineId)
    if (routine) {
      const nextDate = format(computeNextDueDate(routine), 'yyyy-MM-dd')

      const { error: rErr } = await sb.from('routines').update({ next_due_date: nextDate }).eq('id', routineId)
      if (rErr) console.error('[useRoutines] markDone update routine error:', rErr)

      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        const { error: newOccErr } = await sb.from('routine_occurrences').insert({
          routine_id: routineId,
          owner_id: user.id,
          due_date: nextDate,
          status: 'pending',
        })
        if (newOccErr) console.error('[useRoutines] markDone insert next occurrence error:', newOccErr)
      }
    }
    await fetchRoutines()
  }

  const deleteRoutine = async (id: string) => {
    const sb = createClient()
    const { error } = await sb.from('routines').delete().eq('id', id)
    if (error) console.error('[useRoutines] deleteRoutine error:', error)
    await fetchRoutines()
  }

  return { routines, loading, overdueCount, fetchRoutines, createRoutine, markDone, deleteRoutine }
}
