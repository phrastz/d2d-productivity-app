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
    <div className="min-h-screen bg-gray-100 p-3 md:p-10">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-700 to-purple-500 text-white p-5 md:p-12">
          <h1 className="text-2xl md:text-4xl font-bold mb-3">📌 Weekly Timeline - Detailed View</h1>
          <div className="text-sm md:text-lg opacity-95">Daily Task Breakdown & Progress Tracking</div>
          
          <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-6">
            <button
              onClick={goToPreviousWeek}
              className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30"
            >
              ← Previous Week
            </button>
            <div className="px-3 md:px-6 py-2 bg-white/20 rounded-lg backdrop-blur-lg font-semibold text-sm md:text-base">
              Week of {weekStart.toLocaleDateString()}
            </div>
            <button
              onClick={goToNextWeek}
              className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30"
            >
              Next Week →
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 bg-white/15 backdrop-blur-lg p-4 md:p-6 rounded-2xl">
            <div className="text-center">
              <div className="text-xs md:text-sm opacity-90 mb-1">Total Tasks</div>
              <div className="text-2xl md:text-3xl font-bold">{totalTasks}</div>
            </div>
            <div className="text-center">
              <div className="text-xs md:text-sm opacity-90 mb-1">Completed</div>
              <div className="text-2xl md:text-3xl font-bold">{completedTasks}</div>
            </div>
            <div className="text-center">
              <div className="text-xs md:text-sm opacity-90 mb-1">In Progress</div>
              <div className="text-2xl md:text-3xl font-bold">
                {Object.values(data).flat().filter(t => t.status === 'in_progress').length}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs md:text-sm opacity-90 mb-1">Completion Rate</div>
              <div className="text-2xl md:text-3xl font-bold">
                {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 md:p-12">
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
              {Object.entries(data).map(([day, tasks]) => (
                <div key={day}>
                  <div className="bg-gradient-to-r from-purple-100 to-indigo-100 px-4 md:px-6 py-3 md:py-4 rounded-xl mb-4">
                    <div className="flex flex-wrap justify-between items-center gap-1">
                      <h3 className="text-base md:text-xl font-bold text-purple-900">
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
                            {task.description && (
                              <div className="text-sm text-gray-600 mb-2">
                                {task.description.length > 100 ? task.description.slice(0, 100) + '…' : task.description}
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs text-gray-500">
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
          
          <div className="mt-8 md:mt-12 flex flex-col sm:flex-row gap-2 sm:gap-4">
            <button
              onClick={() => router.push('/reports')}
              className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
            >
              ← Back to Reports
            </button>
            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto px-6 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700"
            >
              �️ Print / Save as PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
