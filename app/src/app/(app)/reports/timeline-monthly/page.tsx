'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getMonthlyTimelineData } from '@/lib/reportData';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const OCC_STATUS_COLOR: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  delayed:   'bg-amber-100 text-amber-700 border-amber-300',
  pending:   'bg-gray-100 text-gray-500 border-gray-300',
};

const getMonthPosition = (date: string, yearStart: Date) => {
  const d = new Date(date);
  const monthsDiff = (d.getFullYear() - yearStart.getFullYear()) * 12 + (d.getMonth() - yearStart.getMonth());
  return (monthsDiff / 12) * 100;
};

const getMonthWidth = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  return (months / 12) * 100;
};

const calcExpectedProgress = (startDate: string, endDate: string): number => {
  const start = new Date(startDate + 'T00:00:00').getTime();
  const end   = new Date(endDate   + 'T00:00:00').getTime();
  const now   = Date.now();
  if (now <= start) return 0;
  if (now >= end)   return 100;
  return Math.round(((now - start) / (end - start)) * 100);
};

const getBarColor = (project: any): string => {
  if (!project.start_date || !project.end_date) return 'linear-gradient(90deg,#8b5cf6,#a78bfa)';
  const today   = new Date();
  const endDate = new Date(project.end_date + 'T00:00:00');
  if (endDate < today) return 'linear-gradient(90deg,#ef4444,#f87171)';  // overdue
  const expected = calcExpectedProgress(project.start_date, project.end_date);
  const actual   = project.progress_percentage ?? 0;
  return actual >= expected
    ? 'linear-gradient(90deg,#10b981,#34d399)'   // on track
    : 'linear-gradient(90deg,#f59e0b,#fbbf24)';  // behind schedule
};

export default function TimelineMonthlyPage() {
  const router = useRouter();
  const [projects, setProjects]       = useState<any[]>([]);
  const [routineOccs, setRoutineOccs] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab]     = useState<'all' | 'projects' | 'routines'>('all');

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const result = await getMonthlyTimelineData(user.id, selectedYear);
      setProjects(result.projects ?? []);
      setRoutineOccs(result.routineOccs ?? []);
      setLoading(false);
    }
    loadData();
  }, [router, selectedYear]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center">
          <div className="text-4xl mb-4">📅</div>
          <div className="text-xl font-semibold text-slate-900 dark:text-white">Loading Timeline...</div>
        </div>
      </div>
    );
  }
  
  // TODAY position as percentage of the selected year (day-precise)
  const todayPct: number | null = (() => {
    const today = new Date();
    if (today.getFullYear() !== selectedYear) return null;
    const month      = today.getMonth();
    const day        = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), month + 1, 0).getDate();
    return ((month + (day - 1) / daysInMonth) / 12) * 100;
  })();

  // Group routine occurrences by month number
  const occsByMonth: Record<number, any[]> = {};
  routineOccs.forEach(occ => {
    const m = new Date(occ.due_date + 'T00:00:00').getMonth();
    if (!occsByMonth[m]) occsByMonth[m] = [];
    occsByMonth[m].push(occ);
  });

  return (
    <div className="min-h-screen bg-gray-100 p-3 md:p-10">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-purple-500 text-white p-5 md:p-12">
          <h1 className="text-2xl md:text-4xl font-bold mb-3">📅 Timeline - Monthly View</h1>
          <div className="text-sm md:text-lg opacity-95">12-Month Roadmap & Routine Schedule</div>

          <div className="flex flex-wrap items-end gap-6 mt-6">
            <div>
              <label className="text-sm opacity-90 mb-2 block">Select Year:</label>
              <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 rounded-lg bg-white/20 backdrop-blur-lg text-white border-2 border-white/30">
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y} className="text-gray-900">{y}</option>)}
              </select>
            </div>
            {/* Tab switcher */}
            <div className="flex flex-wrap gap-2">
              {(['all', 'projects', 'routines'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? 'bg-white text-purple-700' : 'bg-white/20 hover:bg-white/30'}`}>
                  {tab === 'all' ? '🗓️ All' : tab === 'projects' ? '📁 Projects Timeline' : '🔄 Routines Schedule'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 md:p-12">
          {/* ── Projects Tab ── */}
          {(activeTab === 'projects' || activeTab === 'all') && (
            <>
              <div className="mb-6">
                <h2 className="text-lg md:text-2xl font-bold mb-1">Projects for {selectedYear}</h2>
                <p className="text-gray-600 mb-3">Showing {projects.length} project{projects.length !== 1 ? 's' : ''} overlapping this year</p>
                <div className="flex flex-wrap gap-4 text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" /> On Track</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Behind Schedule</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Overdue</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-violet-400 inline-block" /> No Dates Set</span>
                  <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 bg-red-500 inline-block" /> Today</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border-2 border-amber-400 inline-block" style={{background:'repeating-linear-gradient(90deg,rgba(251,191,36,0.3) 0px,rgba(251,191,36,0.3) 3px,transparent 3px,transparent 6px)'}} /> Task scope exceeds deadline</span>
                </div>
              </div>

              {projects.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-xl font-semibold text-gray-700 mb-2">No Projects Found</p>
                  <p className="text-gray-500 mb-6">No projects scheduled for {selectedYear}</p>
                  <button onClick={() => router.push('/projects')} className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700">Create New Project</button>
                </div>
              ) : (
                <div className="bg-white rounded-lg p-3 md:p-6 mb-6">
                  <div className="overflow-x-auto w-full">
                    <div className="min-w-[800px]">
                      {/* Header row: spacer for name column + 12 month labels + spacer for status badge */}
                      <div className="flex items-center gap-3 border-b-2 border-gray-300 pb-2 mb-4">
                        <div className="w-48 shrink-0" />
                        <div className="flex-1 relative">
                          {todayPct !== null && (
                            <div className="absolute -top-1 flex flex-col items-center pointer-events-none z-10" style={{ left: `${todayPct}%`, transform: 'translateX(-50%)' }}>
                              <span className="text-[9px] font-bold text-red-500 whitespace-nowrap leading-none">▼ TODAY</span>
                            </div>
                          )}
                          <div className="grid grid-cols-12 gap-0">
                            {MONTHS.map(m => <div key={m} className="text-center text-xs font-semibold text-gray-600">{m}</div>)}
                          </div>
                        </div>
                        <div className="w-20 shrink-0" />
                      </div>
                      {projects.map((project: any, idx: number) => (
                        <div key={project.id} className="mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-48 shrink-0">
                              <div className="font-bold text-gray-900 text-sm flex items-center gap-1">
                                <span className="truncate">{project.name}</span>
                                {project.timeline_change_reason && (
                                  <span title={project.timeline_change_reason}
                                    className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-[10px] font-bold cursor-help flex-shrink-0"
                                  >ℹ</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                {project.start_date && new Date(project.start_date + 'T00:00:00').toLocaleDateString()} – {project.end_date && new Date(project.end_date + 'T00:00:00').toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex-1 relative h-10 bg-gray-100 rounded overflow-hidden">
                              {/* TODAY vertical line */}
                              {todayPct !== null && (
                                <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 opacity-70"
                                  style={{ left: `${todayPct}%` }}
                                  title={`Today: ${new Date().toLocaleDateString()}`}
                                />
                              )}
                              {project.start_date && project.end_date && (
                                <>
                                  {/* Main Gantt bar */}
                                  <div className="absolute h-full rounded flex items-center px-3 text-white text-xs font-semibold"
                                    style={{
                                      left: `${getMonthPosition(project.start_date, new Date(selectedYear, 0, 1))}%`,
                                      width: `${getMonthWidth(project.start_date, project.end_date)}%`,
                                      background: getBarColor(project),
                                    }}
                                    title={project.max_task_due_date
                                      ? `Project end: ${project.end_date} | Latest task: ${project.max_task_due_date}`
                                      : `${project.start_date} → ${project.end_date}`
                                    }>
                                    {project.progress_percentage || 0}%
                                  </div>
                                  {/* Dashed extension: tasks scheduled beyond project end_date */}
                                  {project.max_task_due_date && project.max_task_due_date > project.end_date && (() => {
                                    const endD      = new Date(project.end_date          + 'T00:00:00');
                                    const maxD      = new Date(project.max_task_due_date + 'T00:00:00');
                                    const endMo     = (endD.getFullYear() - selectedYear) * 12 + endD.getMonth();
                                    const rawMaxMo  = (maxD.getFullYear() - selectedYear) * 12 + maxD.getMonth();
                                    const maxMo     = Math.min(rawMaxMo, 11); // cap at Dec of selected year
                                    if (maxMo <= endMo) return null;
                                    const extLeft  = ((endMo + 1) / 12) * 100;
                                    const extWidth = ((maxMo - endMo) / 12) * 100;
                                    return (
                                      <div className="absolute top-3 bottom-3 rounded border-2 border-amber-400 pointer-events-none"
                                        style={{
                                          left: `${Math.min(extLeft, 97)}%`,
                                          width: `${extWidth}%`,
                                          background: 'repeating-linear-gradient(90deg,rgba(251,191,36,0.25) 0px,rgba(251,191,36,0.25) 5px,transparent 5px,transparent 10px)',
                                        }}
                                        title={`Some tasks are planned beyond this project's end date. Consider updating the project deadline.\nLatest task: ${project.max_task_due_date}`}
                                      />
                                    );
                                  })()}
                                </>
                              )}
                            </div>
                            <span className={`w-20 shrink-0 text-center px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                              project.status === 'done' ? 'bg-green-100 text-green-700'
                              : project.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                            }`}>{project.status?.replace('_', ' ').toUpperCase()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-3 md:hidden">← Scroll to see full timeline →</p>
                </div>
              )}
            </>
          )}

          {/* ── Routines Schedule Tab ── */}
          {(activeTab === 'routines' || activeTab === 'all') && (
            <>
              <div className="mb-6 flex items-center gap-4 flex-wrap">
                <h2 className="text-lg md:text-2xl font-bold">Routines Schedule {selectedYear}</h2>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Completed</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Delayed</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-300 inline-block" /> Pending</span>
                </div>
              </div>

              {routineOccs.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-xl font-semibold text-gray-700 mb-2">No Routine Occurrences</p>
                  <p className="text-gray-500 mb-6">No routine occurrences scheduled for {selectedYear}</p>
                  <button onClick={() => router.push('/routines')} className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700">Manage Routines</button>
                </div>
              ) : (
                <div className="space-y-8">
                  {MONTHS.map((monthName, mIdx) => {
                    const monthOccs = occsByMonth[mIdx];
                    if (!monthOccs || monthOccs.length === 0) return null;
                    const completed = monthOccs.filter(o => o.status === 'completed').length;
                    const onTimeRate = Math.round((completed / monthOccs.length) * 100);
                    return (
                      <div key={monthName}>
                        <div className="flex items-center justify-between mb-3 border-b-2 border-purple-200 pb-2">
                          <h3 className="text-base font-bold text-purple-800">{monthName} {selectedYear}</h3>
                          <span className="text-sm text-gray-500">{monthOccs.length} occurrences · {onTimeRate}% on-time</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {monthOccs.map((occ: any) => (
                            <div key={occ.id} className={`flex items-center gap-3 p-3 rounded-xl border ${OCC_STATUS_COLOR[occ.status] ?? OCC_STATUS_COLOR.pending}`}>
                              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                occ.status === 'completed' ? 'bg-emerald-500'
                                : occ.status === 'delayed' ? 'bg-amber-500' : 'bg-gray-400'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate">{occ.routines?.title ?? '—'}</p>
                                <p className="text-[10px] text-gray-500">{new Date(occ.due_date + 'T00:00:00').toLocaleDateString()}</p>
                                {occ.delay_reason && <p className="text-[10px] text-red-500 truncate">⚠ {occ.delay_reason}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
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
