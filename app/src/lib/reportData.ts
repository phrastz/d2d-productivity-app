import { createClient } from '@/lib/supabase/client';

export async function getExecutiveSummaryData(userId: string, dateRange: { start: Date; end: Date }) {
  const supabase = createClient();
  
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      tasks(*)
    `)
    .eq('owner_id', userId)
    .gte('created_at', dateRange.start.toISOString())
    .lte('created_at', dateRange.end.toISOString());
  
  if (error) {
    console.error('Error fetching executive summary data:', error);
    return null;
  }
  
  const totalProjects = projects?.length || 0;
  const totalTasks = projects?.reduce((sum, p) => sum + (p.tasks?.length || 0), 0) || 0;
  const completedTasks = projects?.reduce((sum, p) => 
    sum + (p.tasks?.filter((t: any) => t.status === 'done').length || 0), 0) || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const inProgressTasks = projects?.reduce((sum, p) => 
    sum + (p.tasks?.filter((t: any) => t.status === 'in_progress').length || 0), 0) || 0;
  
  return {
    totalProjects,
    completionRate,
    totalTasks,
    completedTasks,
    inProgressTasks,
    projects,
  };
}

export async function getProjectDetailData(projectId: string) {
  const supabase = createClient();
  
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      sub_projects(
        *,
        tasks(*)
      )
    `)
    .eq('id', projectId)
    .single();
  
  if (error) {
    console.error('Error fetching project detail:', error);
    return null;
  }
  
  const allTasks = project.sub_projects?.flatMap((sp: any) => sp.tasks || []) || [];
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t: any) => t.status === 'done').length;
  const inProgressTasks = allTasks.filter((t: any) => t.status === 'in_progress').length;
  const blockedTasks = allTasks.filter((t: any) => t.status === 'blocked').length;
  
  return {
    ...project,
    stats: {
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    }
  };
}

export async function getWeeklyTimelineData(userId: string, weekStart: Date) {
  const supabase = createClient();
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      sub_projects(
        *,
        projects(*)
      )
    `)
    .gte('due_date', weekStart.toISOString())
    .lt('due_date', weekEnd.toISOString())
    .order('due_date', { ascending: true });
  
  if (error) {
    console.error('Error fetching weekly timeline:', error);
    return null;
  }
  
  const tasksByDay: Record<string, any[]> = {};
  
  tasks?.forEach(task => {
    const dayKey = new Date(task.due_date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
    
    if (!tasksByDay[dayKey]) {
      tasksByDay[dayKey] = [];
    }
    tasksByDay[dayKey].push(task);
  });
  
  return tasksByDay;
}

export async function getMonthlyTimelineData(userId: string, year: number) {
  const supabase = createClient();
  
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      sub_projects(
        *,
        tasks(*)
      )
    `)
    .eq('owner_id', userId)
    .gte('start_date', `${year}-01-01`)
    .lte('end_date', `${year}-12-31`)
    .order('start_date', { ascending: true });
  
  if (error) {
    console.error('Error fetching monthly timeline:', error);
    return null;
  }
  
  return projects;
}
