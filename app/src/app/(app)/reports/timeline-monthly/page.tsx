'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getMonthlyTimelineData } from '@/lib/reportData';

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

export default function TimelineMonthlyPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }
      
      const projectsData = await getMonthlyTimelineData(user.id, selectedYear);
      setData(projectsData || []);
      setLoading(false);
    }
    
    loadData();
  }, [router, selectedYear]);
  
  const getMonthSpan = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return Math.max(1, months);
  };
  
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
  
  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-700 to-purple-500 text-white p-12">
          <h1 className="text-4xl font-bold mb-3">📅 Project Timeline - Monthly View</h1>
          <div className="text-lg opacity-95">12-Month Roadmap & Milestones</div>
          
          <div className="mt-6">
            <label className="text-sm opacity-90 mb-2 block">Select Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 rounded-lg bg-white/20 backdrop-blur-lg text-white border-2 border-white/30"
            >
              {[2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year} className="text-gray-900">
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="p-12">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">
              Projects for {selectedYear}
            </h2>
            <p className="text-gray-600">
              Showing {data.length} projects scheduled this year
            </p>
          </div>
          
          {data.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📭</div>
              <div className="text-xl font-semibold text-gray-700 mb-2">
                No Projects Found
              </div>
              <p className="text-gray-500 mb-6">
                No projects scheduled for {selectedYear}
              </p>
              <button
                onClick={() => router.push('/projects')}
                className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                Create New Project
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-6 mb-6">
              <div className="grid grid-cols-12 gap-0 border-b-2 border-gray-300 pb-2 mb-4">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
                  <div key={month} className="text-center text-sm font-semibold text-gray-600">
                    {month}
                  </div>
                ))}
              </div>
              
              {data.map((project: any, idx: number) => (
                <div key={project.id} className="mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-64 flex-shrink-0">
                      <div className="font-bold text-gray-900">{project.name}</div>
                      <div className="text-xs text-gray-500">
                        {project.start_date && new Date(project.start_date).toLocaleDateString()} - {project.end_date && new Date(project.end_date).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex-1 relative h-10 bg-gray-100 rounded">
                      {project.start_date && project.end_date && (
                        <div
                          className="absolute h-full rounded flex items-center px-3 text-white text-xs font-semibold"
                          style={{
                            left: `${getMonthPosition(project.start_date, new Date(selectedYear, 0, 1))}%`,
                            width: `${getMonthWidth(project.start_date, project.end_date)}%`,
                            background: idx % 4 === 0 
                              ? 'linear-gradient(90deg, #ec4899, #f472b6)'
                              : idx % 4 === 1
                              ? 'linear-gradient(90deg, #8b5cf6, #a78bfa)'
                              : idx % 4 === 2
                              ? 'linear-gradient(90deg, #06b6d4, #22d3ee)'
                              : 'linear-gradient(90deg, #10b981, #34d399)'
                          }}
                        >
                          {project.progress_percentage || 0}%
                        </div>
                      )}
                    </div>
                    
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      project.status === 'done'
                        ? 'bg-green-100 text-green-700'
                        : project.status === 'in_progress'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {project.status?.replace('_', ' ').toUpperCase()}
                    </span>
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
