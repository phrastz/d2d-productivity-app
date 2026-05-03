'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getProjectDetailData } from '@/lib/reportData';

export default function ProjectDetailPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
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
    async function loadProjectDetail() {
      if (!selectedProjectId) return;
      
      setLoading(true);
      const projectData = await getProjectDetailData(selectedProjectId);
      setData(projectData);
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
    <div className="min-h-screen bg-gray-50 p-10">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-12">
          <h1 className="text-4xl font-bold mb-3">🎯 Project Deep Dive Report</h1>
          
          {projects.length > 1 && (
            <div className="mt-6">
              <label className="text-sm opacity-90 mb-2 block">Select Project:</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="px-4 py-2 rounded-lg bg-white/20 backdrop-blur-lg text-white border-2 border-white/30 focus:border-white/50 outline-none"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id} className="text-gray-900">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="grid grid-cols-6 gap-4 mt-8 bg-white/15 backdrop-blur-lg p-6 rounded-2xl">
            <div className="text-center">
              <div className="text-sm opacity-90 mb-2">Progress</div>
              <div className="text-3xl font-bold">{data.stats?.progress || 0}%</div>
            </div>
            <div className="text-center">
              <div className="text-sm opacity-90 mb-2">Total Tasks</div>
              <div className="text-3xl font-bold">{data.stats?.totalTasks || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-sm opacity-90 mb-2">Completed</div>
              <div className="text-3xl font-bold">{data.stats?.completedTasks || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-sm opacity-90 mb-2">In Progress</div>
              <div className="text-3xl font-bold">{data.stats?.inProgressTasks || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-sm opacity-90 mb-2">Blocked</div>
              <div className="text-3xl font-bold text-red-300">{data.stats?.blockedTasks || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-sm opacity-90 mb-2">Sub-Projects</div>
              <div className="text-3xl font-bold">{data.sub_projects?.length || 0}</div>
            </div>
          </div>
        </div>
        
        <div className="p-12">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">{data.name}</h2>
            {data.description && (
              <p className="text-gray-600">{data.description}</p>
            )}
          </div>
          
          <div className="mb-12">
            <h3 className="text-xl font-bold mb-4 border-b-3 border-purple-600 pb-2">
              📊 Overall Progress
            </h3>
            <div className="h-12 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center px-6 text-white font-bold text-lg transition-all duration-500"
                style={{ width: `${data.stats?.progress || 0}%` }}
              >
                {data.stats?.progress || 0}% Complete ({data.stats?.completedTasks || 0} of {data.stats?.totalTasks || 0} tasks)
              </div>
            </div>
          </div>
          
          {data.sub_projects?.map((subProject: any, idx: number) => (
            <div key={subProject.id} className="mb-8 bg-gray-50 rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-purple-700">
                  {subProject.name}
                </h3>
                <span className="text-sm text-gray-500">
                  {subProject.tasks?.length || 0} tasks
                </span>
              </div>
              
              {subProject.tasks?.map((task: any) => (
                <div
                  key={task.id}
                  className="bg-white p-4 rounded-lg mb-3 border-l-4 border-gray-300 hover:border-purple-500 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-2">
                        {task.title}
                      </div>
                      {task.notes && (
                        <div className="text-sm text-gray-600 mb-2">
                          {task.notes}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 flex gap-4">
                        {task.due_date && (
                          <span>📅 Due: {new Date(task.due_date).toLocaleDateString()}</span>
                        )}
                        {task.estimated_hours && (
                          <span>⏱️ Est: {task.estimated_hours}h</span>
                        )}
                      </div>
                    </div>
                    
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      task.status === 'done' 
                        ? 'bg-green-100 text-green-700'
                        : task.status === 'in_progress'
                        ? 'bg-yellow-100 text-yellow-700'
                        : task.status === 'blocked'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {task.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
          
          <div className="mt-12 flex gap-4">
            <button
              onClick={() => router.push('/reports')}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
            >
              ← Back to Reports
            </button>
            <button
              onClick={() => window.print()}
              className="px-6 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700"
            >
              🖨️ Print / Save as PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
