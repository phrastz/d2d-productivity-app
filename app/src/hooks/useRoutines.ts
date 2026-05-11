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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const today = format(new Date(), 'yyyy-MM-dd')

    const [{ data: routinesData }, { data: occData }] = await Promise.all([
      supabase.from('routines').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
      supabase.from('routine_occurrences').select('*').eq('owner_id', user.id).order('due_date', { ascending: false }),
    ])

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
    setLoading(false)
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: routine, error } = await supabase.from('routines').insert({
      ...payload,
      owner_id: user.id,
    }).select().single()
    if (error) throw error

    if (checklistLabels.length > 0) {
      await supabase.from('routine_checklist_items').insert(
        checklistLabels.map((label, i) => ({
          routine_id: routine.id,
          owner_id: user.id,
          label,
          sort_order: i,
        }))
      )
    }

    if (routine.next_due_date) {
      await supabase.from('routine_occurrences').insert({
        routine_id: routine.id,
        owner_id: user.id,
        due_date: routine.next_due_date,
        status: 'pending',
      })
    }

    return routine as Routine
  }

  const markDone = async (routineId: string, occurrenceId: string) => {
    const now = new Date().toISOString()
    await supabase.from('routine_occurrences').update({
      status: 'completed',
      completed_at: now,
    }).eq('id', occurrenceId)

    const routine = routines.find(r => r.id === routineId)
    if (routine) {
      const nextDate = format(computeNextDueDate(routine), 'yyyy-MM-dd')
      await supabase.from('routines').update({ next_due_date: nextDate }).eq('id', routineId)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('routine_occurrences').insert({
          routine_id: routineId,
          owner_id: user.id,
          due_date: nextDate,
          status: 'pending',
        })
      }
    }
    fetchRoutines()
  }

  const deleteRoutine = async (id: string) => {
    await supabase.from('routines').delete().eq('id', id)
    fetchRoutines()
  }

  return { routines, loading, overdueCount, fetchRoutines, createRoutine, markDone, deleteRoutine }
}
