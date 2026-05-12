import { createClient } from '@/lib/supabase/client';

export async function getExecutiveSummaryData(userId: string, dateRange: { start: Date; end: Date }) {
  const supabase = createClient();

  const startStr = dateRange.start.toISOString().split('T')[0];
  const endStr   = dateRange.end.toISOString().split('T')[0];

  const [
    { data: projects, error: pErr },
    { data: routines, error: rErr },
    { data: occurrences, error: oErr },
  ] = await Promise.all([
    supabase.from('projects').select('*, tasks(*)').eq('owner_id', userId)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString()),
    supabase.from('routines').select('*').eq('owner_id', userId),
    supabase.from('routine_occurrences').select('*').eq('owner_id', userId)
      .gte('due_date', startStr).lte('due_date', endStr),
  ]);

  if (pErr) { console.error('Error fetching executive summary data:', pErr); return null; }
  if (rErr) console.error('Error fetching routines:', rErr);
  if (oErr) console.error('Error fetching occurrences:', oErr);

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

  const wTotal = completedTasks + completedOccs;
  const workDistribution = wTotal > 0 ? [
    { name: 'Projects', value: completedTasks, pct: Math.round((completedTasks / wTotal) * 100) },
    { name: 'Routines', value: completedOccs,  pct: Math.round((completedOccs  / wTotal) * 100) },
  ] : [];

  return {
    totalProjects, completionRate, totalTasks, completedTasks, inProgressTasks, projects,
    totalRoutines, completedOccs, delayedOccs, pendingOccs, routineOnTimeRate, routineDelayRate,
    workDistribution,
  };
}

export async function getProjectDetailData(projectId: string) {
  const supabase = createClient();

  const { data: project, error } = await supabase
    .from('projects')
    .select('*, sub_projects(*, tasks(*))')
    .eq('id', projectId)
    .single();

  if (error) { console.error('Error fetching project detail:', error); return null; }

  const allTasks        = project.sub_projects?.flatMap((sp: any) => sp.tasks || []) || [];
  const totalTasks      = allTasks.length;
  const completedTasks  = allTasks.filter((t: any) => t.status === 'done').length;
  const inProgressTasks = allTasks.filter((t: any) => t.status === 'in_progress').length;
  const blockedTasks    = allTasks.filter((t: any) => t.status === 'blocked').length;

  return {
    ...project,
    stats: {
      totalTasks, completedTasks, inProgressTasks, blockedTasks,
      progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
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

export async function getWeeklyTimelineData(userId: string, weekStart: Date) {
  const supabase = createClient();

  const weekEnd    = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const startStr   = weekStart.toISOString().split('T')[0];
  const endStr     = weekEnd.toISOString().split('T')[0];

  const [
    { data: tasks,       error: tErr },
    { data: routineOccs, error: rErr },
  ] = await Promise.all([
    supabase.from('tasks')
      .select('*, sub_projects(*, projects(*))')
      .gte('due_date', weekStart.toISOString())
      .lt('due_date', weekEnd.toISOString())
      .order('due_date', { ascending: true }),
    supabase.from('routine_occurrences')
      .select('*, routines(title, category, frequency_type)')
      .eq('owner_id', userId)
      .gte('due_date', startStr)
      .lt('due_date', endStr)
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
      .select('*, sub_projects(*, tasks(*))')
      .eq('owner_id', userId)
      .gte('start_date', `${year}-01-01`)
      .lte('end_date', `${year}-12-31`)
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

  return {
    projects:    projects    ?? [],
    routineOccs: routineOccs ?? [],
    routines:    routines    ?? [],
  };
}
