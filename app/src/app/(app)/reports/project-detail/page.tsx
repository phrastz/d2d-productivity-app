'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getProjectDetailData, getRoutinesReportData } from '@/lib/reportData';

type TaskStatusFilter = 'all' | 'todo' | 'in_progress' | 'done' | 'blocked' | 'cancelled';
const STATUS_LABELS: Record<string, string> = { todo: 'Todo', in_progress: 'In Progress', done: 'Done', blocked: 'Blocked', cancelled: 'Cancelled' };
const STATUS_COLORS: Record<string, string> = {
  done: 'bg-green-100 text-green-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  blocked: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  todo: 'bg-blue-100 text-blue-700',
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatusFilter>('all');
  const [routinesData, setRoutinesData] = useState<any[]>([]);
  const [routinesLoading, setRoutinesLoading] = useState(true);
  
  useEffect(() => {
    async function loadProjects() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }
      
      const { data: userProjects } = await supabase
        .from('projects')
        .select('id, name')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      
      if (userProjects && userProjects.length > 0) {
        setProjects(userProjects);
        setSelectedProjectId(userProjects[0].id);
      } else {
        setLoading(false);
      }
    }
    
    loadProjects();
  }, [router]);

  useEffect(() => {
    async function loadRoutines() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const rd = await getRoutinesReportData(user.id);
      setRoutinesData(rd ?? []);
      setRoutinesLoading(false);
    }
    loadRoutines();
  }, []);
  
  useEffect(() => {
    async function loadProjectDetail() {
      if (!selectedProjectId) return;
      
      setLoading(true);
      
      if (selectedProjectId === 'ALL') {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: allProjects } = await supabase
          .from('projects')
          .select(`
            *,
            sub_projects(
              *,
              tasks(*)
            )
          `)
          .eq('owner_id', user?.id)
          .order('created_at', { ascending: false });
        
        const allTasks = allProjects?.flatMap(p => 
          p.sub_projects?.flatMap((sp: any) => sp.tasks || []) || []
        ) || [];
        
        const stats = {
          totalTasks: allTasks.length,
          completedTasks: allTasks.filter((t: any) => t.status === 'done').length,
          inProgressTasks: allTasks.filter((t: any) => t.status === 'in_progress').length,
          blockedTasks: allTasks.filter((t: any) => t.status === 'blocked').length,
          progress: allTasks.length > 0 
            ? Math.round((allTasks.filter((t: any) => t.status === 'done').length / allTasks.length) * 100)
            : 0
        };
        
        setData({
          name: 'All Projects Combined',
          description: `Showing ${allProjects?.length || 0} projects`,
          sub_projects: allProjects?.flatMap(p => p.sub_projects || []) || [],
          stats
        });
      } else {
        const projectData = await getProjectDetailData(selectedProjectId);
        setData(projectData);
      }
      
      setLoading(false);
    }
    
    loadProjectDetail();
  }, [selectedProjectId]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center">
          <div className="text-4xl mb-4">🎯</div>
          <div className="text-xl font-semibold text-slate-900 dark:text-white">Loading Project Details...</div>
        </div>
      </div>
    );
  }
  
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center">
          <div className="text-4xl mb-4">📁</div>
          <div className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">No Projects Found</div>
          <button
            onClick={() => router.push('/projects')}
            className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            Create Your First Project
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-10">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-5 md:p-12">
          <h1 className="text-2xl md:text-4xl font-bold mb-3">🎯 Project Deep Dive Report</h1>
          
          {projects.length > 0 && (
            <div className="mt-6">
              <label className="text-sm opacity-90 mb-2 block">Select Project:</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="px-4 py-2 rounded-lg bg-white/20 backdrop-blur-lg text-white border-2 border-white/30 focus:border-white/50 outline-none"
              >
                <option value="ALL" className="text-gray-900">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id} className="text-gray-900">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 md:mt-8 bg-white/15 backdrop-blur-lg p-4 md:p-6 rounded-2xl">
            <div className="text-center">
              <div className="text-xs md:text-sm opacity-90 mb-1">Progress</div>
              <div className="text-2xl md:text-3xl font-bold">{data.stats?.progress || 0}%</div>
            </div>
            <div className="text-center">
              <div className="text-xs md:text-sm opacity-90 mb-1">Total Tasks</div>
              <div className="text-2xl md:text-3xl font-bold">{data.stats?.totalTasks || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-xs md:text-sm opacity-90 mb-1">Completed</div>
              <div className="text-2xl md:text-3xl font-bold">{data.stats?.completedTasks || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-xs md:text-sm opacity-90 mb-1">In Progress</div>
              <div className="text-2xl md:text-3xl font-bold">{data.stats?.inProgressTasks || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-xs md:text-sm opacity-90 mb-1">Blocked</div>
              <div className="text-2xl md:text-3xl font-bold text-red-300">{data.stats?.blockedTasks || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-xs md:text-sm opacity-90 mb-1">Sub-Projects</div>
              <div className="text-2xl md:text-3xl font-bold">{data.sub_projects?.length || 0}</div>
            </div>
          </div>
        </div>
        
        <div className="p-4 md:p-12">
          <div className="mb-8">
            <h2 className="text-xl md:text-3xl font-bold mb-2">{data.name}</h2>
            {data.description && (
              <p className="text-gray-600">{data.description}</p>
            )}
          </div>
          
          <div className="mb-12">
            <h3 className="text-base md:text-xl font-bold mb-4 border-b-3 border-purple-600 pb-2">
              📊 Overall Progress
            </h3>
            <div className="h-12 bg-gray-200 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-500"
                style={{ width: `${data.stats?.progress || 0}%` }}
              ></div>
              
              <div className="absolute inset-0 flex items-center justify-between px-3 md:px-6">
                <span className={`font-bold text-sm md:text-lg ${
                  (data.stats?.progress || 0) >= 30
                    ? 'text-white'
                    : 'text-purple-600'
                }`}>
                  {data.stats?.progress || 0}% Complete
                </span>
                <span className={`text-xs md:text-sm font-semibold ${
                  (data.stats?.progress || 0) >= 30
                    ? 'text-white'
                    : 'text-gray-600'
                }`}>
                  ({data.stats?.completedTasks || 0} of {data.stats?.totalTasks || 0} tasks)
                </span>
              </div>
            </div>
          </div>
          
          {/* Task Status Filter */}
          <div className="mb-6 flex flex-wrap gap-2 items-center">
            <span className="text-sm font-semibold text-gray-600">Filter tasks:</span>
            {(['all', 'todo', 'in_progress', 'done', 'blocked', 'cancelled'] as TaskStatusFilter[]).map(s => (
              <button key={s} onClick={() => setTaskStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  taskStatusFilter === s ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'
                }`}>
                {s === 'all' ? 'All' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {data.sub_projects?.map((subProject: any, idx: number) => {
            const filteredTasks = (subProject.tasks || []).filter((t: any) =>
              taskStatusFilter === 'all' || t.status === taskStatusFilter
            );
            if (filteredTasks.length === 0) return null;
            return (
              <div key={subProject.id} className="mb-8 bg-gray-50 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-1">
                  <h3 className="text-base md:text-xl font-bold text-purple-700">{subProject.name}</h3>
                  <span className="text-xs sm:text-sm text-gray-500">{filteredTasks.length} tasks</span>
                </div>
                {filteredTasks.map((task: any) => (
                  <div key={task.id} className={`bg-white p-4 rounded-lg mb-3 border-l-4 hover:shadow-md transition-all ${
                    task.status === 'done' ? 'border-green-400' : task.status === 'in_progress' ? 'border-yellow-400'
                    : task.status === 'blocked' ? 'border-red-400' : task.status === 'cancelled' ? 'border-gray-300' : 'border-blue-400'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-2">{task.title}</div>
                        {task.notes && <div className="text-sm text-gray-600 mb-2">{task.notes}</div>}
                        <div className="text-xs text-gray-500 flex flex-wrap gap-2 md:gap-4">
                          {task.due_date && <span>📅 Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                          {task.estimated_hours && <span>⏱️ Est: {task.estimated_hours}h</span>}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${STATUS_COLORS[task.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[task.status] ?? task.status?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          
          {/* Routine Deep Dive */}
          {!routinesLoading && routinesData.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl md:text-2xl font-bold mb-6 border-b-4 border-emerald-500 pb-4">🔄 Routine Deep Dive</h2>
              <div className="space-y-6">
                {routinesData.map(routine => (
                  <div key={routine.id} className="bg-emerald-50 rounded-xl p-5 border border-emerald-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <h3 className="text-base font-bold text-emerald-800">{routine.title}</h3>
                        {routine.category && <span className="text-xs text-emerald-600">{routine.category}</span>}
                      </div>
                      <div className="flex gap-3 text-sm">
                        <span className="font-semibold text-emerald-700">
                          {routine.onTimeRate !== null ? `${routine.onTimeRate}% on-time` : 'No data yet'}
                        </span>
                        <span className="text-gray-500">·</span>
                        <span className="text-gray-600">{routine.completed} done · {routine.delayed} delayed</span>
                      </div>
                    </div>
                    {routine.occurrences?.length > 0 && (
                      <div className="space-y-0">
                        {routine.occurrences.map((occ: any) => (
                          <div key={occ.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-emerald-100 last:border-0">
                            <span className="text-gray-500 w-24 shrink-0">{new Date(occ.due_date + 'T00:00:00').toLocaleDateString()}</span>
                            <span className={`px-2 py-0.5 rounded-full font-semibold uppercase ${
                              occ.status === 'completed' ? 'bg-green-100 text-green-700'
                              : occ.status === 'delayed' ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-500'
                            }`}>{occ.status}</span>
                            {occ.delay_reason && <span className="text-red-600 truncate">⚠ {occ.delay_reason}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {routine.delayReasons?.length > 0 && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-xs font-semibold text-red-600 mb-1">Delay Reasons</p>
                        {routine.delayReasons.map((dr: any, i: number) => (
                          <p key={i} className="text-xs text-gray-700">
                            <span className="text-gray-400">{new Date(dr.date + 'T00:00:00').toLocaleDateString()}:</span> {dr.reason}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 md:mt-12 flex flex-col sm:flex-row gap-2 sm:gap-4">
            <button onClick={() => router.push('/reports')} className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">← Back to Reports</button>
            <button onClick={() => window.print()} className="w-full sm:w-auto px-6 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700">🖨️ Print / Save as PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
}
