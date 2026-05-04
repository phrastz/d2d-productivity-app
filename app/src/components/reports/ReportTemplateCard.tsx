'use client';

import { useRouter } from 'next/navigation';

interface ReportTemplateCardProps {
  icon: string;
  title: string;
  description: string;
  forUseCase: string;
  templatePath: string;
  dynamicPath: string;
}

export function ReportTemplateCard({
  icon,
  title,
  description,
  forUseCase,
  templatePath,
  dynamicPath
}: ReportTemplateCardProps) {
  const router = useRouter();
  
  const handlePreview = () => {
    window.open(templatePath, '_blank');
  };
  
  const handleGenerate = () => {
    router.push(dynamicPath);
  };
  
  return (
    <div className="bg-white dark:bg-slate-900/90 border-2 border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-lg transition-all duration-200 flex flex-col h-full">
      <div className="text-4xl mb-4">{icon}</div>
      
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        {description}
      </p>
      
      <div className="mb-6">
        <div className="text-xs text-slate-500 dark:text-slate-500 mb-1 uppercase tracking-wide">
          Best for:
        </div>
        <div className="text-sm text-violet-600 dark:text-violet-400 font-medium">
          {forUseCase}
        </div>
      </div>
      
      <div className="flex gap-3 mt-auto pt-4">
        <button
          onClick={handlePreview}
          className="flex-1 px-4 py-2 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-lg font-medium hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors"
        >
          👁️ Preview Template
        </button>
        
        <button
          onClick={handleGenerate}
          className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
        >
          <span>📊</span>
          <span>Generate</span>
        </button>
      </div>
    </div>
  );
}
