'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getExecutiveSummaryData } from '@/lib/reportData';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type WorkFilter = 'all' | 'projects' | 'routines';
const WORK_COLORS = ['#8b5cf6', '#10b981'];

export default function ExecutiveSummaryPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [workFilter, setWorkFilter] = useState<WorkFilter>('all');
  
  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        router.push('/login');
        return;
      }
      
      setUser(currentUser);
      
      const dateRange = {
        start: new Date(new Date().setDate(new Date().getDate() - 30)),
        end: new Date()
      };
      
      const reportData = await getExecutiveSummaryData(currentUser.id, dateRange);
      setData(reportData);
      setLoading(false);
    }
    
    loadData();
  }, [router]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-xl font-semibold text-slate-900 dark:text-white">Generating Report...</div>
        </div>
      </div>
    );
  }
  
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-xl font-semibold text-slate-900 dark:text-white">No data available</div>
        </div>
      </div>
    );
  }
  
  const showProjects = workFilter !== 'routines';
  const showRoutines = workFilter !== 'projects';

  const kpiCards = showProjects ? [
    { emoji: '🎯', label: 'Tasks Completed', value: data.completedTasks, sub: `${data.completionRate}% completion rate`, bar: data.completionRate },
    { emoji: '✅', label: 'Task Completion Rate', value: `${data.completionRate}%`, sub: `${data.completedTasks} of ${data.totalTasks} tasks`, bar: data.completionRate },
    { emoji: '⚡', label: 'Active Tasks', value: data.inProgressTasks, sub: 'Currently in progress', bar: null },
  ] : [
    { emoji: '🔄', label: 'Routines Completed', value: data.completedOccs, sub: `${data.routineOnTimeRate}% on-time rate`, bar: data.routineOnTimeRate },
    { emoji: '✅', label: 'On-Time Rate', value: `${data.routineOnTimeRate}%`, sub: `${data.completedOccs} completed, ${data.delayedOccs} delayed`, bar: data.routineOnTimeRate },
    { emoji: '⏳', label: 'Pending Occurrences', value: data.pendingOccs, sub: 'Awaiting completion', bar: null },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-purple-800 p-3 md:p-10">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48" />
          <div className="relative z-10">
            <h1 className="text-2xl md:text-5xl font-bold mb-3 tracking-tight">📊 Executive Summary</h1>
            <div className="text-sm md:text-lg opacity-95">Performance Overview & Strategic Insights</div>
            <div className="text-sm opacity-90 mt-1">📅 Report Period: Last 30 Days | Generated: {new Date().toLocaleDateString()}</div>

            {/* Work Type filter */}
            <div className="flex items-center gap-2 mt-5">
              <span className="text-xs opacity-80 uppercase tracking-wide">View:</span>
              {(['all', 'projects', 'routines'] as WorkFilter[]).map(f => (
                <button key={f} onClick={() => setWorkFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${workFilter === f ? 'bg-white text-indigo-700' : 'bg-white/20 hover:bg-white/30'}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* KPI banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 bg-white/15 backdrop-blur-lg p-4 md:p-8 rounded-2xl">
              {showProjects ? <>
                <div className="text-center">
                  <div className="text-xs md:text-sm opacity-90 mb-2 uppercase tracking-wide">Total Projects</div>
                  <div className="text-3xl md:text-5xl font-bold">{data.totalProjects}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs md:text-sm opacity-90 mb-2 uppercase tracking-wide">Completion Rate</div>
                  <div className="text-3xl md:text-5xl font-bold">{data.completionRate}%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs md:text-sm opacity-90 mb-2 uppercase tracking-wide">Total Tasks</div>
                  <div className="text-3xl md:text-5xl font-bold">{data.totalTasks}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs md:text-sm opacity-90 mb-2 uppercase tracking-wide">In Progress</div>
                  <div className="text-3xl md:text-5xl font-bold">{data.inProgressTasks}</div>
                </div>
              </> : <>
                <div className="text-center">
                  <div className="text-xs md:text-sm opacity-90 mb-2 uppercase tracking-wide">Total Routines</div>
                  <div className="text-3xl md:text-5xl font-bold">{data.totalRoutines}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs md:text-sm opacity-90 mb-2 uppercase tracking-wide">On-Time Rate</div>
                  <div className="text-3xl md:text-5xl font-bold">{data.routineOnTimeRate}%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs md:text-sm opacity-90 mb-2 uppercase tracking-wide">Completed</div>
                  <div className="text-3xl md:text-5xl font-bold">{data.completedOccs}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs md:text-sm opacity-90 mb-2 uppercase tracking-wide">Delayed</div>
                  <div className="text-3xl md:text-5xl font-bold">{data.delayedOccs}</div>
                </div>
              </>}
            </div>
          </div>
        </div>

        <div className="p-5 md:p-12">
          {/* KPI cards */}
          <h2 className="text-xl md:text-3xl font-bold mb-6 border-b-4 border-indigo-600 pb-4">📈 Key Performance Indicators</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {kpiCards.map(({ emoji, label, value, sub, bar }) => (
              <div key={label} className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-7 hover:border-violet-400 hover:shadow-xl transition-all">
                <div className="text-4xl mb-3">{emoji}</div>
                <div className="text-sm text-gray-500 uppercase tracking-wide mb-3">{label}</div>
                <div className="text-4xl md:text-6xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">{value}</div>
                {bar !== null && bar !== undefined && (
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full" style={{ width: `${Math.min(bar, 100)}%` }} />
                  </div>
                )}
                <div className="text-sm text-gray-500">{sub}</div>
              </div>
            ))}
          </div>

          {/* Work Distribution Pie Chart */}
          {data.workDistribution?.length > 0 && workFilter === 'all' && (
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold mb-6 border-b-4 border-indigo-600 pb-4">🥧 Work Distribution</h2>
              <div className="bg-gray-50 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-8">
                <div style={{ width: '100%', maxWidth: 280, height: 220 }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={data.workDistribution} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} label={(p: any) => `${p.name} ${p.pct ?? 0}%`} labelLine={false}>
                        {data.workDistribution.map((_: any, i: number) => <Cell key={i} fill={WORK_COLORS[i % WORK_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${v} completed`, '']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-4 flex-1">
                  {data.workDistribution.map((item: any, i: number) => (
                    <div key={item.name} className="flex items-center gap-4">
                      <div className="w-4 h-4 rounded-full shrink-0" style={{ background: WORK_COLORS[i] }} />
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.value} completed · {item.pct}% of work</p>
                        <div className="h-2 bg-gray-200 rounded-full mt-1">
                          <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: WORK_COLORS[i] }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Routines Performance section */}
          {showRoutines && data.totalRoutines > 0 && (
            <div className="mb-10">
              <h2 className="text-xl md:text-2xl font-bold mb-6 border-b-4 border-emerald-500 pb-4">🔄 Routines Performance</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Active Routines', value: data.totalRoutines, emoji: '🔄' },
                  { label: 'On-Time Rate', value: `${data.routineOnTimeRate}%`, emoji: '✅', highlight: data.routineOnTimeRate >= 80 ? 'text-emerald-600' : data.routineOnTimeRate >= 50 ? 'text-amber-600' : 'text-red-600' },
                  { label: 'Delay Rate', value: `${data.routineDelayRate}%`, emoji: '⚠️', highlight: data.routineDelayRate <= 10 ? 'text-emerald-600' : data.routineDelayRate <= 30 ? 'text-amber-600' : 'text-red-600' },
                  { label: 'Pending', value: data.pendingOccs, emoji: '⏳' },
                ].map(({ label, value, emoji, highlight }) => (
                  <div key={label} className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-5 text-center">
                    <div className="text-2xl mb-2">{emoji}</div>
                    <div className={`text-3xl font-extrabold ${highlight ?? 'text-emerald-700'} mb-1`}>{value}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-2 sm:gap-4">
            <button onClick={() => router.push('/reports')} className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">← Back to Reports</button>
            <button onClick={() => window.print()} className="w-full sm:w-auto px-6 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors">🖨️ Print / Save as PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
}
