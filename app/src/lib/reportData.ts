import { createClient } from '@/lib/supabase/client';

export async function getExecutiveSummaryData(userId: string, dateRange: { start: Date; end: Date }) {
  const supabase = createClient();

  const startStr = dateRange.start.toISOString().split('T')[0];
  const endStr   = dateRange.end.toISOString().split('T')[0];

  const currentYear = new Date().getFullYear();

  const [
    { data: projects, error: pErr },
    { data: routines, error: rErr },
    { data: occurrences, error: oErr },
    { count: yearOccCount, error: ycErr },
    { count: totalNotes,    error: nErr },
    { data: notes,         error: pnErr },
  ] = await Promise.all([
    supabase.from('projects').select('*, tasks(*)').eq('owner_id', userId)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString()),
    supabase.from('routines').select('*').eq('owner_id', userId),
    supabase.from('routine_occurrences').select('*').eq('owner_id', userId)
      .gte('due_date', startStr).lte('due_date', endStr),
    supabase.from('routine_occurrences').select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .gte('due_date', `${currentYear}-01-01`)
      .lte('due_date', `${currentYear}-12-31`),
    supabase.from('notes').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
    supabase.from('notes').select('follow_up_status').eq('owner_id', userId),
  ]);

  if (pErr) { console.error('Error fetching executive summary data:', pErr); return null; }
  if (rErr)  console.error('Error fetching routines:', rErr);
  if (oErr)  console.error('Error fetching occurrences:', oErr);
  if (ycErr) console.error('Error fetching year occ count:', ycErr);
  if (nErr)  console.error('Error fetching notes count:', nErr);
  if (pnErr) console.error('Error fetching notes statuses:', pnErr);
  console.log('[ExecutiveSummary] yearOccCount:', yearOccCount, 'totalRoutines:', routines?.length, 'occs in dateRange:', (occurrences ?? []).length);

  const totalProjects   = projects?.length || 0;
  const totalTasks      = projects?.reduce((s, p) => s + (p.tasks?.length || 0), 0) || 0;
  const completedTasks  = projects?.reduce((s, p) => s + (p.tasks?.filter((t: any) => t.status === 'done').length || 0), 0) || 0;
  const completionRate  = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const inProgressTasks = projects?.reduce((s, p) => s + (p.tasks?.filter((t: any) => t.status === 'in_progress').length || 0), 0) || 0;

  const occs              = occurrences ?? [];
  const totalRoutines     = routines?.length || 0;
  const completedOccs     = occs.filter(o => o.status === 'completed').length;
  const delayedOccs       = occs.filter(o => o.status === 'delayed').length;
  const pendingOccs       = occs.filter(o => o.status === 'pending').length;
  const routineOnTimeRate = occs.length > 0 ? Math.round((completedOccs / occs.length) * 100) : 0;
  const routineDelayRate  = occs.length > 0 ? Math.round((delayedOccs / occs.length) * 100) : 0;

  // For workload distribution use the full-year occurrence count so future
  // occurrences (outside the dateRange window) are included. Fall back to
  // active routine count if no occurrences have been generated yet.
  const workloadOccs = (yearOccCount ?? 0) > 0 ? (yearOccCount as number) : (totalRoutines || 0);
  const wTotal = totalTasks + workloadOccs;
  const workDistribution = wTotal > 0 ? [
    { name: 'Projects', value: totalTasks,    pct: Math.round((totalTasks    / wTotal) * 100) },
    { name: 'Routines', value: workloadOccs,  pct: Math.round((workloadOccs  / wTotal) * 100) },
  ] : [];

  const noteList        = notes ?? [];
  const pendingNotes    = noteList.filter((n: any) => (n.follow_up_status ?? 'pending') === 'pending').length;

  return {
    totalProjects, completionRate, totalTasks, completedTasks, inProgressTasks, projects,
    totalRoutines, completedOccs, delayedOccs, pendingOccs, routineOnTimeRate, routineDelayRate,
    workDistribution,
    totalNotes: totalNotes ?? 0, pendingNotes,
  };
}

export async function getProjectDetailData(projectId: string) {
  const supabase = createClient();

  const [
    { data: project, error: pErr },
    { data: directTasks, error: tErr },
  ] = await Promise.all([
    supabase.from('projects').select('*, sub_projects(*, tasks(*))').eq('id', projectId).single(),
    supabase.from('tasks').select('*').eq('project_id', projectId).is('sub_project_id', null),
  ]);

  if (pErr) { console.error('Error fetching project detail:', pErr); return null; }
  if (tErr) console.error('Error fetching direct tasks:', tErr);

  const subTasks    = project?.sub_projects?.flatMap((sp: any) => sp.tasks || []) || [];
  const subTaskIds  = new Set(subTasks.map((t: any) => t.id));
  const allTasks    = [...subTasks, ...(directTasks ?? []).filter((t: any) => !subTaskIds.has(t.id))];

  const totalTasks      = allTasks.length;
  const completedTasks  = allTasks.filter((t: any) => t.status === 'done').length;
  const inProgressTasks = allTasks.filter((t: any) => t.status === 'in_progress').length;
  const blockedTasks    = allTasks.filter((t: any) => t.status === 'blocked').length;

  const taskDatesSorted = allTasks
    .flatMap((t: any) => [t.due_date, t.end_date].filter(Boolean))
    .map((d: string) => d.substring(0, 10))
    .sort();
  const max_task_due_date = taskDatesSorted.length > 0
    ? taskDatesSorted[taskDatesSorted.length - 1]
    : null;

  return {
    ...project,
    max_task_due_date,
    stats: {
      totalTasks, completedTasks, inProgressTasks, blockedTasks,
      progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      max_task_due_date,
    },
  };
}

export async function getRoutinesReportData(userId: string) {
  const supabase = createClient();

  const [
    { data: routines, error: rErr },
    { data: occurrences, error: oErr },
  ] = await Promise.all([
    supabase.from('routines').select('*').eq('owner_id', userId).order('title'),
    supabase.from('routine_occurrences').select('*').eq('owner_id', userId).order('due_date', { ascending: false }),
  ]);

  if (rErr) console.error('Error fetching routines report:', rErr);
  if (oErr) console.error('Error fetching occurrences report:', oErr);

  const occs = occurrences ?? [];
  const enriched = (routines ?? []).map(r => {
    const routineOccs = occs.filter(o => o.routine_id === r.id);
    const completed   = routineOccs.filter(o => o.status === 'completed').length;
    const delayed     = routineOccs.filter(o => o.status === 'delayed').length;
    const onTimeRate  = routineOccs.length > 0 ? Math.round((completed / routineOccs.length) * 100) : null;
    const delayReasons = routineOccs.filter(o => o.delay_reason).map(o => ({
      date: o.due_date, reason: o.delay_reason,
    }));
    return { ...r, occurrences: routineOccs.slice(0, 10), completed, delayed, onTimeRate, delayReasons };
  });

  return enriched;
}

const toLocalDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export async function getWeeklyTimelineData(userId: string, weekStart: Date) {
  const supabase = createClient();

  const weekEndTimestamp = new Date(weekStart);
  weekEndTimestamp.setDate(weekEndTimestamp.getDate() + 7); // next Monday for timestamp comparisons

  const weekSunday = new Date(weekStart);
  weekSunday.setDate(weekSunday.getDate() + 6); // Sunday of the same week

  const startStr = toLocalDateStr(weekStart);  // Monday (local)
  const endStr   = toLocalDateStr(weekSunday); // Sunday (local)

  const [
    { data: tasks,       error: tErr },
    { data: routineOccs, error: rErr },
  ] = await Promise.all([
    supabase.from('tasks')
      .select('*, sub_projects(*, projects(*))')
      .gte('due_date', weekStart.toISOString())
      .lt('due_date', weekEndTimestamp.toISOString())
      .order('due_date', { ascending: true }),
    supabase.from('routine_occurrences')
      .select('*, routines(title, category, frequency_type)')
      .eq('owner_id', userId)
      .gte('due_date', startStr)
      .lte('due_date', endStr)
      .order('due_date', { ascending: true }),
  ]);

  if (tErr) console.error('Error fetching weekly tasks:', tErr);
  if (rErr) console.error('Error fetching weekly routines:', rErr);

  const tasksByDay: Record<string, any[]> = {};
  tasks?.forEach(task => {
    const key = new Date(task.due_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    if (!tasksByDay[key]) tasksByDay[key] = [];
    tasksByDay[key].push(task);
  });

  const occsByDay: Record<string, any[]> = {};
  routineOccs?.forEach(occ => {
    const key = new Date(occ.due_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    if (!occsByDay[key]) occsByDay[key] = [];
    occsByDay[key].push(occ);
  });

  const occs            = routineOccs ?? [];
  const completedOccs   = occs.filter(o => o.status === 'completed').length;
  const delayedOccs     = occs.filter(o => o.status === 'delayed').length;
  const routineOnTimeRate = occs.length > 0 ? Math.round((completedOccs / occs.length) * 100) : 0;

  return { tasksByDay, occsByDay, totalOccs: occs.length, completedOccs, delayedOccs, routineOnTimeRate };
}

export async function getMonthlyTimelineData(userId: string, year: number) {
  const supabase = createClient();

  const [
    { data: projects,    error: pErr },
    { data: routineOccs, error: rErr },
    { data: routines,    error: rtErr },
  ] = await Promise.all([
    supabase.from('projects')
      .select('*')
      .eq('owner_id', userId)
      .not('start_date', 'is', null)
      .lte('start_date', `${year}-12-31`)
      .order('start_date', { ascending: true }),
    supabase.from('routine_occurrences')
      .select('*, routines(title, category)')
      .eq('owner_id', userId)
      .gte('due_date', `${year}-01-01`)
      .lte('due_date', `${year}-12-31`)
      .order('due_date', { ascending: true }),
    supabase.from('routines').select('id, title, category, status').eq('owner_id', userId).eq('status', 'active'),
  ]);

  if (pErr)  console.error('Error fetching monthly projects:', pErr);
  if (rErr)  console.error('Error fetching monthly routine occs:', rErr);
  if (rtErr) console.error('Error fetching monthly routines:', rtErr);

  // Keep only projects that overlap the selected year:
  // started before Dec 31 of year (already filtered in query) AND
  // ended on or after Jan 1 of year (or ongoing with no end_date)
  const yearStart = `${year}-01-01`;
  const filteredProjects = (projects ?? []).filter(p => !p.end_date || p.end_date >= yearStart);

  // Fetch the latest task due/end date per project (for Gantt extension indicator)
  const projectIds = filteredProjects.map((p: any) => p.id);
  const taskMaxDates: Record<string, string> = {};
  if (projectIds.length > 0) {
    const { data: projTasks } = await supabase
      .from('tasks')
      .select('project_id, due_date, end_date')
      .in('project_id', projectIds);
    (projTasks ?? []).forEach((t: any) => {
      const best = [t.due_date, t.end_date]
        .filter(Boolean)
        .map((d: string) => d.substring(0, 10))
        .sort()
        .pop();
      if (best && (!taskMaxDates[t.project_id] || best > taskMaxDates[t.project_id])) {
        taskMaxDates[t.project_id] = best;
      }
    });
  }

  const enrichedProjects = filteredProjects.map((p: any) => ({
    ...p,
    max_task_due_date: taskMaxDates[p.id] ?? null,
  }));

  return {
    projects:    enrichedProjects,
    routineOccs: routineOccs ?? [],
    routines:    routines    ?? [],
  };
}
