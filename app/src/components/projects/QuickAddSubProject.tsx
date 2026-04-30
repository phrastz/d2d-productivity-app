'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export default function QuickAddSubProject() {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  // Fetch active projects for dropdown
  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (!error && data) setProjects(data);
    };
    fetchProjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !projectId) return alert('Nama Sub Project dan Target Project wajib diisi!');
    
    setLoading(true);
    const { error } = await supabase.from('sub_projects').insert({
      name,
      project_id: projectId,
      start_date: startDate || null,
      end_date: endDate || null,
      status: 'not_started',
      priority: 'medium',
      order_index: 0,
    });
    setLoading(false);

    if (!error) {
      setOpen(false);
      setName(''); setStartDate(''); setEndDate('');
      router.refresh();
    } else {
      alert('Gagal create sub project: ' + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-2 rounded-md border border-slate-600 bg-transparent px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-slate-700 cursor-pointer">
        <PlusCircle className="h-4 w-4" />
        Quick Add Sub Project
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Quick Add Sub Project</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label>Sub Project Name</Label>
            <Input placeholder="e.g., API Integration" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          
          <div>
            <Label>Target Project</Label>
            <Select value={projectId} onValueChange={setProjectId} required>
              <SelectTrigger><SelectValue placeholder="Select parent project..." /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Sub Project
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
