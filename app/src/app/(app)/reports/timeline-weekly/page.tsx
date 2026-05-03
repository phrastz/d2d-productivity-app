'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getWeeklyTimelineData } from '@/lib/reportData';

export default function TimelineWeeklyPage() {
  const router = useRouter();
  const [data, setData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(getStartOfWeek(new Date()));
  
  function getStartOfWeek(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }
  
  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }
      
      const weekData = await getWeeklyTimelineData(user.id, weekStart);
      setData(weekData || {});
      setLoading(false);
    }
    
    loadData();
  }, [router, weekStart]);
  
  const goToPreviousWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() - 7);
    setWeekStart(newDate);
  };
  
  const goToNextWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + 7);
    setWeekStart(newDate);
  };
  
  const totalTasks = Object.values(data).flat().length;
  const completedTasks = Object.values(data).flat().filter(t => t.status === 'done').length;
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center">
          <div className="text-4xl mb-4">📌</div>
          <div className="text-xl font-semibold text-slate-900 dark:text-white">Loading Weekly Timeline...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-700 to-purple-500 text-white p-12">
          <h1 className="text-4xl font-bold mb-3">📌 Weekly Timeline - Detailed View</h1>
          <div className="text-lg opacity-95">Daily Task Breakdown & Progress Tracking</div>
          
          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={goToPreviousWeek}
              className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30"
            >
              ← Previous Week
            </button>
            <div className="px-6 py-2 bg-white/20 rounded-lg backdrop-blur-lg font-semibold">
              Week of {weekStart.toLocaleDateString()}
            </div>
            <button
              onClick={goToNextWeek}
              className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30"
            >
              Next Week →
            </button>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mt-6 bg-white/15 backdrop-blur-lg p-6 rounded-2xl">
            <div className="text-center">
              <div className="text-sm opacity-90 mb-2">Total Tasks</div>
              <div className="text-3xl font-bold">{totalTasks}</div>
            </div>
            <div className="text-center">
              <div className="text-sm opacity-90 mb-2">Completed</div>
              <div className="text-3xl font-bold">{completedTasks}</div>
            </div>
            <div className="text-center">
              <div className="text-sm opacity-90 mb-2">In Progress</div>
              <div className="text-3xl font-bold">
                {Object.values(data).flat().filter(t => t.status === 'in_progress').length}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm opacity-90 mb-2">Completion Rate</div>
              <div className="text-3xl font-bold">
                {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-12">
          {Object.keys(data).length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📭</div>
              <div className="text-xl font-semibold text-gray-700 mb-2">
                No Tasks This Week
              </div>
              <p className="text-gray-500 mb-6">
                No tasks scheduled for this week
              </p>
              <button
                onClick={() => router.push('/tasks')}
                className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                Create New Task
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="mb-8 flex gap-6 flex-wrap items-center bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-3 rounded bg-gradient-to-r from-pink-500 to-pink-400"></div>
                  <span className="text-sm text-gray-600">Design Work</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-3 rounded bg-gradient-to-r from-purple-600 to-purple-400"></div>
                  <span className="text-sm text-gray-600">Development</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-3 rounded bg-gradient-to-r from-cyan-500 to-cyan-400"></div>
                  <span className="text-sm text-gray-600">Testing & QA</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-3 rounded bg-gradient-to-r from-orange-500 to-orange-400"></div>
                  <span className="text-sm text-gray-600">Meetings</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-3 rounded bg-gradient-to-r from-green-500 to-green-400"></div>
                  <span className="text-sm text-gray-600">Code Review</span>
                </div>
              </div>
              
              {Object.entries(data).map(([day, tasks]) => (
                <div key={day}>
                  <div className="bg-gradient-to-r from-purple-100 to-indigo-100 px-6 py-4 rounded-xl mb-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-bold text-purple-900">
                        {day}
                      </h3>
                      <div className="text-sm text-purple-700 font-semibold">
                        {tasks.length} tasks
                        {' • '}
                        {tasks.filter(t => t.status === 'done').length} completed
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {tasks.map((task: any) => (
                      <div
                        key={task.id}
                        className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-purple-400 transition-colors"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 mb-1">
                              {task.title}
                            </div>
                            {task.notes && (
                              <div className="text-sm text-gray-600 mb-2">
                                {task.notes}
                              </div>
                            )}
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              {task.sub_projects?.projects?.name && (
                                <span className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded font-medium">
                                  <span>📁</span>
                                  <span>{task.sub_projects.projects.name}</span>
                                </span>
                              )}
                              {task.sub_projects?.name && (
                                <span className="text-gray-600">
                                  → {task.sub_projects.name}
                                </span>
                              )}
                              {task.estimated_hours && (
                                <span className="flex items-center gap-1">
                                  <span>⏱️</span>
                                  <span>{task.estimated_hours}h</span>
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase whitespace-nowrap ${
                            task.status === 'done'
                              ? 'bg-green-100 text-green-700'
                              : task.status === 'in_progress'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {task.status?.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          
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
