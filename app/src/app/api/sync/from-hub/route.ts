import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'crypto'

const EXTERNAL_SOURCE = 'marketing_hub'

interface HubTaskPayload {
  id: string
  name: string
  parent_task_id: string | null
  start_date: string | null
  due_date: string | null
}

interface HubSyncPayload {
  hub_project_id: string
  name: string
  start_date: string | null
  end_date: string | null
  tasks: HubTaskPayload[]
}

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.SYNC_SECRET
  if (!expected) return false

  const provided = request.headers.get('x-sync-secret') || ''
  const expectedBuf = Buffer.from(expected)
  const providedBuf = Buffer.from(provided)

  // Lengths must match before timingSafeEqual, but compare against a
  // fixed-size buffer first so we don't leak length via early return timing.
  if (providedBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(providedBuf, expectedBuf)
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase service role credentials')
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function isValidPayload(body: unknown): body is HubSyncPayload {
  if (!body || typeof body !== 'object') return false
  const p = body as Record<string, unknown>
  if (typeof p.hub_project_id !== 'string' || !p.hub_project_id) return false
  if (typeof p.name !== 'string' || !p.name) return false
  if (!Array.isArray(p.tasks)) return false
  return p.tasks.every(
    (t) =>
      t &&
      typeof t === 'object' &&
      typeof (t as Record<string, unknown>).id === 'string' &&
      typeof (t as Record<string, unknown>).name === 'string'
  )
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: 'Invalid payload: hub_project_id, name, and tasks[] (with id + name) are required' },
      { status: 400 }
    )
  }

  const { hub_project_id, name, start_date, end_date, tasks } = body

  let supabase
  try {
    supabase = getServiceClient()
  } catch (err) {
    console.error('sync/from-hub: missing service credentials', err)
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  try {
    // 1. Upsert the project by external_id. Existing projects only get their
    //    name/dates refreshed — KPI fields and progress data are never touched.
    const { data: existingProject, error: findProjectError } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('external_id', hub_project_id)
      .maybeSingle()

    if (findProjectError) throw findProjectError

    let projectId: string
    let ownerId: string

    if (existingProject) {
      const { error: updateError } = await supabase
        .from('projects')
        .update({ name, start_date, end_date })
        .eq('id', existingProject.id)

      if (updateError) throw updateError

      projectId = existingProject.id
      ownerId = existingProject.owner_id
    } else {
      const defaultOwnerId = process.env.SYNC_DEFAULT_OWNER_ID
      if (!defaultOwnerId) {
        console.error('sync/from-hub: SYNC_DEFAULT_OWNER_ID is not configured')
        return NextResponse.json(
          { error: 'Server misconfigured: no default owner for hub-synced projects' },
          { status: 500 }
        )
      }

      const { data: newProject, error: insertError } = await supabase
        .from('projects')
        .insert({
          owner_id: defaultOwnerId,
          name,
          start_date,
          end_date,
          external_id: hub_project_id,
          external_source: EXTERNAL_SOURCE,
        })
        .select('id, owner_id')
        .single()

      if (insertError) throw insertError

      projectId = newProject.id
      ownerId = newProject.owner_id
    }

    // 2. Upsert tasks by external_id. Only title/dates/project are touched on
    //    update — status, progress_percent, effort, etc. are left alone.
    if (tasks.length > 0) {
      const hubTaskIds = tasks.map((t) => t.id)
      const parentHubIds = tasks
        .map((t) => t.parent_task_id)
        .filter((id): id is string => !!id)
      const referencedHubIds = Array.from(new Set([...hubTaskIds, ...parentHubIds]))

      const { data: existingTasks, error: findTasksError } = await supabase
        .from('tasks')
        .select('id, external_id')
        .in('external_id', referencedHubIds)

      if (findTasksError) throw findTasksError

      // Maps hub task id -> D2D task id. Seeded with anything already synced
      // (including parents referenced but not present in this payload).
      const hubIdToTaskId = new Map<string, string>(
        (existingTasks || []).map((t) => [t.external_id as string, t.id as string])
      )

      const tasksToUpdate = tasks.filter((t) => hubIdToTaskId.has(t.id))
      const tasksToInsert = tasks.filter((t) => !hubIdToTaskId.has(t.id))

      await Promise.all(
        tasksToUpdate.map(async (t) => {
          const taskId = hubIdToTaskId.get(t.id)!
          const { error } = await supabase
            .from('tasks')
            .update({
              title: t.name,
              start_date: t.start_date,
              due_date: t.due_date,
              project_id: projectId,
            })
            .eq('id', taskId)
          if (error) throw error
        })
      )

      if (tasksToInsert.length > 0) {
        const { data: insertedTasks, error: insertTasksError } = await supabase
          .from('tasks')
          .insert(
            tasksToInsert.map((t) => ({
              owner_id: ownerId,
              project_id: projectId,
              title: t.name,
              start_date: t.start_date,
              due_date: t.due_date,
              external_id: t.id,
              external_source: EXTERNAL_SOURCE,
            }))
          )
          .select('id, external_id')

        if (insertTasksError) throw insertTasksError

        for (const inserted of insertedTasks || []) {
          hubIdToTaskId.set(inserted.external_id as string, inserted.id as string)
        }
      }

      // 3. Second pass: now every task in this payload exists, so parent links
      //    (which may point forward/backward within the same payload) can be resolved.
      const parentUpdates = tasks
        .filter((t) => t.parent_task_id)
        .map((t) => {
          const taskId = hubIdToTaskId.get(t.id)
          const parentId = hubIdToTaskId.get(t.parent_task_id as string)
          return taskId && parentId && taskId !== parentId ? { taskId, parentId } : null
        })
        .filter((u): u is { taskId: string; parentId: string } => u !== null)

      await Promise.all(
        parentUpdates.map(async ({ taskId, parentId }) => {
          const { error } = await supabase
            .from('tasks')
            .update({ parent_task_id: parentId })
            .eq('id', taskId)
          if (error) throw error
        })
      )
    }

    return NextResponse.json({ success: true, project_id: projectId })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('sync/from-hub error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
