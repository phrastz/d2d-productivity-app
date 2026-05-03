'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client'; // Sesuaikan path supabase client kamu
import { MoreVertical, Pencil, Trash2, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type ProjectActionsProps = {
  projectId: string;
  currentName: string;
  currentDescription?: string | null;
  onUpdated?: () => void;
};

export default function ProjectActions({ projectId, currentName, currentDescription, onUpdated }: ProjectActionsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState(currentName);
  const [desc, setDesc] = useState(currentDescription || '');

  const handleUpdate = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('projects')
      .update({ name, description: desc, updated_at: new Date().toISOString() })
      .eq('id', projectId);
    
    setLoading(false);
    if (!error) {
      setOpenEdit(false);
      onUpdated?.();
      router.refresh(); // Refresh server data
    } else {
      alert('Gagal update project: ' + error.message);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    setLoading(false);
    if (!error) {
      router.push('/projects'); // Kembali ke list project
    } else {
      alert('Gagal delete project: ' + error.message);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors dark:hover:bg-muted/50 dark:text-slate-400 dark:hover:text-slate-100 cursor-pointer">
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setOpenEdit(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit Project
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenDelete(true)} className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" /> Delete Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog Edit */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Project Name</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white border-slate-300 dark:border-white/10"
              />
            </div>
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Description</Label>
              <Textarea 
                value={desc} 
                onChange={(e) => setDesc(e.target.value)} 
                rows={3} 
                className="bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white border-slate-300 dark:border-white/10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)} className="border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300">Cancel</Button>
            <Button onClick={handleUpdate} disabled={loading} className="bg-violet-600 hover:bg-violet-700 text-white">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Delete Confirmation */}
      <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
              This will permanently delete "{currentName}" and all its sub-projects & tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
