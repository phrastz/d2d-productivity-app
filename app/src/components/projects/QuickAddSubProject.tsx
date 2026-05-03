'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/DatePicker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface QuickAddSubProjectProps {
  onSuccess?: () => void;
}

export default function QuickAddSubProject({ onSuccess }: QuickAddSubProjectProps) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingProjects, setFetchingProjects] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [dependsOn, setDependsOn] = useState<string>('');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [subProjects, setSubProjects] = useState<{ id: string; name: string; status: string }[]>([]);
  const [fetchingSubProjects, setFetchingSubProjects] = useState(false);

  // Fetch active projects for dropdown when dialog opens
  useEffect(() => {
    if (!open) return;
    
    const fetchProjects = async () => {
      setFetchingProjects(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Please log in to create sub-projects');
          setFetchingProjects(false);
          return;
        }
        
        const { data, error } = await supabase
          .from('projects')
          .select('id, name')
          .eq('status', 'active')
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching projects:', error);
          toast.error('Failed to load projects: ' + error.message);
        } else if (data) {
          setProjects(data);
          if (data.length === 0) {
            toast.info('No active projects found. Create a project first.');
          }
        }
      } catch (err) {
        console.error('Exception fetching projects:', err);
        toast.error('Failed to load projects');
      } finally {
        setFetchingProjects(false);
      }
    };
    
    fetchProjects();
  }, [open, supabase]);

  // Fetch sub-projects for dependency selection when project changes
  useEffect(() => {
    if (!projectId) {
      setSubProjects([]);
      setDependsOn('');
      return;
    }
    
    const fetchSubProjects = async () => {
      setFetchingSubProjects(true);
      try {
        const { data, error } = await supabase
          .from('sub_projects')
          .select('id, name, status')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching sub-projects:', error);
        } else {
          setSubProjects(data || []);
        }
      } catch (err) {
        console.error('Exception fetching sub-projects:', err);
      } finally {
        setFetchingSubProjects(false);
      }
    };
    
    fetchSubProjects();
  }, [projectId, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !projectId) {
      toast.error('Sub Project name and Target Project are required!');
      return;
    }
    
    if (startDate && endDate && endDate < startDate) {
      toast.error('End date cannot be before start date');
      return;
    }
    
    setLoading(true);
    const startDateStr = startDate ? startDate.toISOString().split('T')[0] : null;
    const endDateStr = endDate ? endDate.toISOString().split('T')[0] : null;
    
    const { error } = await supabase.from('sub_projects').insert({
      name,
      project_id: projectId,
      start_date: startDateStr,
      end_date: endDateStr,
      status: 'not_started',
      priority: 'medium',
      order_index: 0,
      depends_on_subproject_id: dependsOn || null,
    });
    setLoading(false);

    if (!error) {
      setOpen(false);
      setName('');
      setProjectId('');
      setStartDate(undefined);
      setEndDate(undefined);
      setDependsOn('');
      toast.success('Sub-project created successfully!');
      
      // Call parent refresh callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      router.refresh();
    } else {
      toast.error('Failed to create sub-project: ' + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-transparent px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors">
        <PlusCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Quick Add Sub Project</span>
        <span className="sm:hidden">+ Sub Project</span>
      </DialogTrigger>
      <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">Quick Add Sub Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label className="text-slate-700 dark:text-slate-300">Sub Project Name</Label>
            <Input 
              placeholder="e.g., API Integration" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
              className="bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white border-slate-300 dark:border-white/10 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          
          <div>
            <Label className="text-slate-700 dark:text-slate-300">Target Project</Label>
            <Select value={projectId} onValueChange={(val) => setProjectId(val || '')} required disabled={fetchingProjects || projects.length === 0}>
              <SelectTrigger className="bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white border-slate-300 dark:border-white/10">
                <SelectValue placeholder={fetchingProjects ? "Loading projects..." : projects.length === 0 ? "No projects available" : "Select parent project..."} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-h-60">
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-slate-900 dark:text-white cursor-pointer">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {projects.length === 0 && !fetchingProjects && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                No active projects found. Create a project first.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Start Date</Label>
              <DatePicker
                date={startDate}
                onSelect={setStartDate}
                placeholder="Pick start date"
              />
            </div>
            <div>
              <Label className="text-slate-700 dark:text-slate-300">End Date</Label>
              <DatePicker
                date={endDate}
                onSelect={setEndDate}
                placeholder="Pick end date"
              />
            </div>
          </div>

          {/* Dependency Selector */}
          {projectId && (
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Depends On (Optional)</Label>
              <Select value={dependsOn} onValueChange={(val) => setDependsOn(val || '')} disabled={fetchingSubProjects}>
                <SelectTrigger className="bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white border-slate-300 dark:border-white/10">
                  <SelectValue placeholder={fetchingSubProjects ? "Loading..." : "No dependency"} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-h-60">
                  <SelectItem value="" className="text-slate-900 dark:text-white cursor-pointer">-- None --</SelectItem>
                  {subProjects.map((sp) => (
                    <SelectItem key={sp.id} value={sp.id} className="text-slate-900 dark:text-white cursor-pointer">
                      {sp.name} ({sp.status.replace('_', ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dependsOn && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  This sub-project cannot start until the dependency is completed
                </p>
              )}
            </div>
          )}

          <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Sub Project
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
