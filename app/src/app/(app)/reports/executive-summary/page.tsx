'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getExecutiveSummaryData } from '@/lib/reportData';

export default function ExecutiveSummaryPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
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
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-purple-800 p-10">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48"></div>
          
          <div className="relative z-10">
            <h1 className="text-5xl font-bold mb-3 tracking-tight">
              📊 Executive Summary
            </h1>
            <div className="text-lg opacity-95">
              Performance Overview & Strategic Insights
            </div>
            <div className="text-sm opacity-90 mt-4">
              📅 Report Period: Last 30 Days | Generated: {new Date().toLocaleDateString()}
            </div>
            
            <div className="grid grid-cols-4 gap-5 mt-8 bg-white/15 backdrop-blur-lg p-8 rounded-2xl">
              <div className="text-center">
                <div className="text-sm opacity-90 mb-3 uppercase tracking-wide">Total Projects</div>
                <div className="text-5xl font-bold">{data.totalProjects}</div>
              </div>
              <div className="text-center">
                <div className="text-sm opacity-90 mb-3 uppercase tracking-wide">Completion Rate</div>
                <div className="text-5xl font-bold">{data.completionRate}%</div>
              </div>
              <div className="text-center">
                <div className="text-sm opacity-90 mb-3 uppercase tracking-wide">Total Tasks</div>
                <div className="text-5xl font-bold">{data.totalTasks}</div>
              </div>
              <div className="text-center">
                <div className="text-sm opacity-90 mb-3 uppercase tracking-wide">In Progress</div>
                <div className="text-5xl font-bold">{data.inProgressTasks}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-12">
          <h2 className="text-3xl font-bold mb-8 border-b-4 border-indigo-600 pb-4">
            📈 Key Performance Indicators
          </h2>
          
          <div className="grid grid-cols-3 gap-6 mb-12">
            <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-7 hover:border-violet-400 hover:shadow-xl transition-all duration-200">
              <div className="text-5xl mb-4">🎯</div>
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-3">
                Projects Completed
              </div>
              <div className="text-6xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
                {data.completedTasks}
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${data.completionRate}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-500 mt-2 flex justify-between">
                <span>Target: {data.totalTasks}</span>
                <span>{data.completionRate}%</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-7 hover:border-violet-400 hover:shadow-xl transition-all duration-200">
              <div className="text-5xl mb-4">✅</div>
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-3">
                Task Completion Rate
              </div>
              <div className="text-6xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
                {data.completionRate}%
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"
                  style={{ width: `${data.completionRate}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-500 mt-2">
                {data.completedTasks} of {data.totalTasks} tasks
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl p-7 hover:border-violet-400 hover:shadow-xl transition-all duration-200">
              <div className="text-5xl mb-4">⚡</div>
              <div className="text-sm text-gray-500 uppercase tracking-wide mb-3">
                Active Tasks
              </div>
              <div className="text-6xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
                {data.inProgressTasks}
              </div>
              <div className="text-sm text-gray-600 mt-4">
                Currently in progress
              </div>
            </div>
          </div>
          
          <div className="mt-12 flex gap-4">
            <button
              onClick={() => router.push('/reports')}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              ← Back to Reports
            </button>
            <button
              onClick={() => window.print()}
              className="px-6 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors"
            >
              🖨️ Print / Save as PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
