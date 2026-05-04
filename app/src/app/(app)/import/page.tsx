'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/layout/TopNav'
import { toast } from 'sonner'
import { Upload, Download, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet, X, ArrowLeft, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { calculateSubProjectProgress, calculateProjectProgress } from '@/lib/progressCalculator'
import type { Task, SubProject } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedRow {
  rowNum: number
  subProject: string
  module: string
  taskTitle: string
  statusRaw: string
  statusMapped: 'todo' | 'in_progress' | 'done' | 'cancelled'
  dateFrom: string | null
  dateTo: string | null
  notes: string
  isValid: boolean
  errors: string[]
}

interface ImportSummary {
  projectName: string
  projectId: string
  subProjectsCreated: number
  tasksImported: number
  rowsSkipped: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALLOWED_STATUSES: Record<string, 'todo' | 'in_progress' | 'done' | 'cancelled'> = {
  '✓ done': 'done',
  'done': 'done',
  '⟳ in progress': 'in_progress',
  'in progress': 'in_progress',
  'in_progress': 'in_progress',
  '⏸ deferred': 'cancelled',
  'deferred': 'cancelled',
  'cancelled': 'cancelled',
  'todo': 'todo',
  'to do': 'todo',
  '': 'todo',
}

function mapStatus(raw: string): 'todo' | 'in_progress' | 'done' | 'cancelled' {
  const key = raw.trim().toLowerCase()
  return ALLOWED_STATUSES[key] ?? 'todo'
}

function parseDate(raw: string): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed || trimmed.toLowerCase() === 'tbd' || trimmed.toLowerCase() === 'ongoing') return null

  // Try "05 Jan 2026", "5 Jan 2026"
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  }
  const dmy = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/)
  if (dmy) {
    const day = parseInt(dmy[1], 10)
    const month = months[dmy[2].toLowerCase()]
    const year = parseInt(dmy[3], 10)
    if (month !== undefined) {
      return new Date(year, month, day).toISOString().split('T')[0]
    }
  }

  // Try numeric serial (xlsx date)
  const num = Number(trimmed)
  if (!isNaN(num) && num > 10000) {
    const d = XLSX.SSF.parse_date_code(num)
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }

  // Try ISO or natural parse
  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0]

  return null
}

function parseRows(rawRows: any[][]): ParsedRow[] {
  return rawRows.map((row, i) => {
    const seq = String(row[0] ?? '').trim()
    const subProject = String(row[1] ?? '').trim()
    const module = String(row[2] ?? '').trim()
    const taskTitle = String(row[3] ?? '').trim()
    const statusRaw = String(row[4] ?? '').trim()
    const dateFromRaw = String(row[5] ?? '').trim()
    const dateToRaw = String(row[6] ?? '').trim()
    const notes = String(row[7] ?? '').trim()

    // Skip section-header rows (both subProject AND taskTitle empty)
    if (!subProject && !taskTitle) {
      return {
        rowNum: i + 2,
        subProject, module, taskTitle,
        statusRaw, statusMapped: 'todo', dateFrom: null, dateTo: null, notes,
        isValid: false,
        errors: ['Empty row — skipped'],
      }
    }

    const errors: string[] = []
    if (!subProject) errors.push('Missing Sub-Project (Col B)')
    if (!taskTitle) errors.push('Missing Task title (Col D)')

    const statusMapped = mapStatus(statusRaw)
    const dateFrom = parseDate(dateFromRaw)
    const dateTo = parseDate(dateToRaw)

    return {
      rowNum: i + 2,
      subProject, module, taskTitle,
      statusRaw, statusMapped,
      dateFrom, dateTo, notes,
      isValid: errors.length === 0,
      errors,
    }
  })
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [projectName, setProjectName] = useState('')
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  const validRows = rows.filter(r => r.isValid)
  const skippedRows = rows.filter(r => !r.isValid)

  // ── File parsing ────────────────────────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    if (!file.name.match(/\.(xlsx|csv)$/i)) {
      toast.error('Please upload an .xlsx or .csv file')
      return
    }

    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array', cellDates: false })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        // Try to detect header row (first row with col D = 'Task')
        let dataStart = 1
        for (let i = 0; i < Math.min(raw.length, 10); i++) {
          const row = raw[i].map((c: any) => String(c).trim().toLowerCase())
          if (row.includes('task') && row.includes('status')) {
            dataStart = i + 1
            break
          }
        }

        const dataRows = raw.slice(dataStart).filter(r => r.some((c: any) => String(c).trim()))
        if (dataRows.length === 0) {
          toast.error('No data found. Check your file format.')
          return
        }

        const parsed = parseRows(dataRows)
        setRows(parsed)
        setStep(2)
      } catch (err) {
        toast.error('Failed to parse file. Ensure it matches the expected format.')
        console.error(err)
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  // ── Import logic ────────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!projectName.trim()) {
      toast.error('Please enter a project name')
      return
    }

    setImporting(true)
    setImportProgress(0)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { toast.error('Please log in'); return }

      // Derive project date range from all imported task dates
      const allImportDates = validRows
        .flatMap(r => [r.dateFrom, r.dateTo])
        .filter(Boolean) as string[]
      const projectStartDate = allImportDates.length > 0
        ? [...allImportDates].sort()[0]
        : null
      const projectEndDate = allImportDates.length > 0
        ? [...allImportDates].sort().at(-1) ?? null
        : null

      // 1. Upsert project
      let projectId: string
      const { data: existingProject } = await supabase
        .from('projects')
        .select('id, start_date, end_date')
        .eq('owner_id', user.id)
        .ilike('name', projectName.trim())
        .maybeSingle()

      if (existingProject) {
        projectId = existingProject.id
        // Backfill dates on existing project if they are not set
        if ((!existingProject.start_date || !existingProject.end_date) && (projectStartDate || projectEndDate)) {
          await supabase.from('projects').update({
            ...(projectStartDate && !existingProject.start_date ? { start_date: projectStartDate } : {}),
            ...(projectEndDate   && !existingProject.end_date   ? { end_date:   projectEndDate   } : {}),
          }).eq('id', projectId)
        }
      } else {
        const { data: newProject, error: projError } = await supabase
          .from('projects')
          .insert({
            owner_id: user.id,
            name: projectName.trim(),
            status: 'active',
            progress_percentage: 0,
            start_date: projectStartDate,
            end_date: projectEndDate,
          })
          .select('id')
          .single()

        if (projError || !newProject) throw new Error(`Failed to create project: ${projError?.message}`)
        projectId = newProject.id
      }

      setImportProgress(10)

      // 2. Group rows by sub-project
      const subProjectMap = new Map<string, ParsedRow[]>()
      for (const row of validRows) {
        const key = row.subProject
        if (!subProjectMap.has(key)) subProjectMap.set(key, [])
        subProjectMap.get(key)!.push(row)
      }

      const subProjectNames = Array.from(subProjectMap.keys())
      let subProjectsCreated = 0
      let tasksImported = 0
      const progressPerSP = 85 / subProjectNames.length
      const insertedSubProjects: SubProject[] = []

      for (let spIdx = 0; spIdx < subProjectNames.length; spIdx++) {
        const spName = subProjectNames[spIdx]
        const spRows = subProjectMap.get(spName)!

        // Upsert sub-project
        let subProjectId: string
        const { data: existingSP } = await supabase
          .from('sub_projects')
          .select('id')
          .eq('project_id', projectId)
          .ilike('name', spName)
          .maybeSingle()

        if (existingSP) {
          subProjectId = existingSP.id
        } else {
          const { data: newSP, error: spError } = await supabase
            .from('sub_projects')
            .insert({
              project_id: projectId,
              owner_id: user.id,
              name: spName,
              status: 'not_started',
              priority: 'medium',
              order_index: spIdx,
              progress_percent: 0,
              weight_contribution: 1,
            })
            .select('id')
            .single()

          if (spError || !newSP) throw new Error(`Failed to create sub-project "${spName}": ${spError?.message}`)
          subProjectId = newSP.id
          subProjectsCreated++
        }

        // Batch insert tasks — Col C → category, Col H → description
        const taskProgress = (status: string) =>
          status === 'done' ? 100 : status === 'in_progress' ? 50 : 0

        const taskInserts = spRows.map(row => ({
          owner_id: user.id,
          project_id: projectId,
          sub_project_id: subProjectId,
          title: row.taskTitle,
          category: row.module || null,
          description: row.notes || null,
          status: row.statusMapped,
          start_date: row.dateFrom,
          due_date: row.dateTo,
          priority: 'medium' as const,
          progress_percent: taskProgress(row.statusMapped),
          is_habit: false,
          time_spent_minutes: 0,
          effort_estimate: 0,
          actual_effort: 0,
          effort_unit: 'hours' as const,
          is_blocked: false,
          is_backdated_entry: false,
        }))

        const { error: tasksError } = await supabase.from('tasks').insert(taskInserts)
        if (tasksError) throw new Error(`Failed to insert tasks for "${spName}": ${tasksError.message}`)

        tasksImported += taskInserts.length

        // Update sub-project progress using the same formula as the app
        const partialTasks = taskInserts.map(t => ({
          status: t.status,
          progress_percent: t.progress_percent,
          effort_estimate: t.effort_estimate,
          actual_effort: t.actual_effort,
        })) as Task[]
        const spProgress = calculateSubProjectProgress(partialTasks)
        await supabase
          .from('sub_projects')
          .update({ progress_percent: spProgress })
          .eq('id', subProjectId)

        // Track sub-project for project-level calculation
        insertedSubProjects.push({
          id: subProjectId,
          progress_percent: spProgress,
          weight_contribution: 1,
        } as SubProject)

        setImportProgress(Math.round(10 + (spIdx + 1) * progressPerSP))
      }

      // 3. Recalculate project progress using the same formula as the app
      const projectProgress = calculateProjectProgress(insertedSubProjects, [])
      await supabase
        .from('projects')
        .update({ progress_percentage: projectProgress })
        .eq('id', projectId)

      // 4. Backfill project dates from actual DB task data
      // Uses COALESCE logic: start_date falls back to due_date and vice versa,
      // so projects with only due_date populated still get correct date range.
      const { data: taskDateRows } = await supabase
        .from('tasks')
        .select('start_date, due_date')
        .eq('project_id', projectId)
      if (taskDateRows && taskDateRows.length > 0) {
        const allDates = taskDateRows
          .flatMap(t => [t.start_date, t.due_date])
          .filter(Boolean) as string[]
        if (allDates.length > 0) {
          const dbMinDate = [...allDates].sort()[0]
          const dbMaxDate = [...allDates].sort().at(-1)!
          await supabase.from('projects').update({
            start_date: dbMinDate,
            end_date:   dbMaxDate,
          }).eq('id', projectId)
        }
      }

      setImportProgress(100)

      setSummary({
        projectName: projectName.trim(),
        projectId,
        subProjectsCreated,
        tasksImported,
        rowsSkipped: skippedRows.length,
      })

      toast.success(`Successfully imported ${tasksImported} tasks!`)
    } catch (err: any) {
      toast.error(err.message || 'Import failed')
      console.error(err)
    } finally {
      setImporting(false)
    }
  }

  // ── Render helpers ───────────────────────────────────────────────────────────

  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-8">
      {([1, 2, 3] as const).map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
            step > s ? 'bg-violet-600 text-white' :
            step === s ? 'bg-violet-600 text-white ring-4 ring-violet-600/30' :
            'bg-slate-200 dark:bg-slate-800 text-slate-500'
          )}>
            {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
          </div>
          <span className={cn('text-sm font-medium', step === s ? 'text-slate-900 dark:text-white' : 'text-slate-500')}>
            {s === 1 ? 'Upload' : s === 2 ? 'Preview' : 'Confirm'}
          </span>
          {i < 2 && <div className={cn('w-12 h-0.5 mx-1', step > s ? 'bg-violet-600' : 'bg-slate-200 dark:bg-slate-700')} />}
        </div>
      ))}
    </div>
  )

  // ── Step 1: Upload ───────────────────────────────────────────────────────────

  const Step1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Upload Your File</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Upload an .xlsx or .csv file following the project import template.
        </p>
      </div>

      {/* Download template */}
      <div className="flex items-center justify-between p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Don't have the template?</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Download the standard Excel import template</p>
          </div>
        </div>
        <a
          href="/import/generate-template"
          download
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Template
        </a>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
            : 'border-slate-300 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <Upload className={cn('w-12 h-12 mx-auto mb-4', isDragging ? 'text-violet-500' : 'text-slate-400')} />
        <p className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
          {isDragging ? 'Drop file here' : 'Drag & drop your file here'}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          or click to browse · Accepts .xlsx and .csv
        </p>
      </div>

      {/* Expected format */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Expected Columns</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              ['A', '#', 'Row number (ignored)'],
              ['B', 'Sub-Project', 'Required'],
              ['C', 'Module / Feature', 'Optional'],
              ['D', 'Task', 'Required'],
              ['E', 'Status', '✓ Done / ⟳ In Progress / ⏸ Deferred'],
              ['F', 'Date From', 'dd MMM yyyy or TBD'],
              ['G', 'Date To', 'dd MMM yyyy or Ongoing'],
              ['H', 'Notes', 'Optional'],
            ].map(([col, name, hint]) => (
              <div key={col} className="flex items-start gap-2">
                <span className="w-6 h-6 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs font-bold flex items-center justify-center flex-shrink-0">{col}</span>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">{name}</p>
                  <p className="text-[10px] text-slate-500">{hint}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // ── Step 2: Preview ─────────────────────────────────────────────────────────

  const Step2 = () => (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Preview Import Data</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Parsed from <span className="font-medium text-slate-700 dark:text-slate-300">{fileName}</span>
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {validRows.length} ready
          </span>
          {skippedRows.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              {skippedRows.length} skipped
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-auto max-h-[480px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-8">#</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Sub-Project</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Module</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Task</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date From</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date To</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.rowNum}
                className={cn(
                  'border-b border-slate-100 dark:border-slate-800 last:border-0',
                  !row.isValid && 'bg-red-50 dark:bg-red-900/10'
                )}
              >
                <td className="px-3 py-2 text-slate-400 text-xs">{row.rowNum}</td>
                <td className="px-3 py-2 font-medium text-slate-900 dark:text-white max-w-[140px] truncate">{row.subProject || <span className="text-red-400 text-xs italic">missing</span>}</td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-400 max-w-[120px] truncate">{row.module}</td>
                <td className="px-3 py-2 text-slate-900 dark:text-white max-w-[200px] truncate">
                  {row.taskTitle || <span className="text-red-400 text-xs italic">missing</span>}
                </td>
                <td className="px-3 py-2">
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    row.statusMapped === 'done' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                    row.statusMapped === 'in_progress' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                    row.statusMapped === 'cancelled' ? 'bg-gray-100 dark:bg-gray-800 text-gray-500' :
                    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  )}>
                    {row.statusMapped.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-400 text-xs">{row.dateFrom ?? '—'}</td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-400 text-xs">
                  {row.dateTo ?? <span className="italic text-slate-400">ongoing</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {validRows.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">No valid rows found. Please fix your file and re-upload.</p>
        </div>
      )}
    </div>
  )

  // ── Step 3: Confirm ─────────────────────────────────────────────────────────

  const Step3 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Confirm & Import</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Enter the parent project name and start importing.
        </p>
      </div>

      {/* Project Name Input */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Project Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="e.g. Website Redesign 2026"
          className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 transition-colors text-sm"
        />
        <p className="text-xs text-slate-500 mt-1.5">
          If a project with this name exists, tasks will be added to it. Otherwise a new project is created.
        </p>
      </div>

      {/* Import summary preview */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Import Summary</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Tasks to Import', value: validRows.length, color: 'text-violet-600 dark:text-violet-400' },
            { label: 'Sub-Projects', value: new Set(validRows.map(r => r.subProject)).size, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Rows Skipped', value: skippedRows.length, color: 'text-red-500' },
            { label: 'From File', value: fileName.substring(0, 16) + (fileName.length > 16 ? '…' : ''), color: 'text-slate-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className={cn('text-2xl font-bold', color)}>{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar during import */}
      {importing && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing...</span>
            <span>{importProgress}%</span>
          </div>
          <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-600 to-purple-600 rounded-full transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Final summary after success */}
      {summary && (
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-5">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            <p className="text-sm font-bold text-green-800 dark:text-green-300">Import Complete!</p>
          </div>
          <p className="text-sm text-green-700 dark:text-green-400">
            Project <strong>"{summary.projectName}"</strong> · {summary.subProjectsCreated} sub-project{summary.subProjectsCreated !== 1 ? 's' : ''} created · {summary.tasksImported} task{summary.tasksImported !== 1 ? 's' : ''} imported · {summary.rowsSkipped} row{summary.rowsSkipped !== 1 ? 's' : ''} skipped
          </p>
          <button
            onClick={() => { window.location.href = '/projects' }}
            className="mt-3 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
          >
            View Projects →
          </button>
        </div>
      )}
    </div>
  )

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
      <TopNav title="Import Project" subtitle="Import tasks from Excel / CSV" />

      <div className="p-6 max-w-5xl mx-auto animate-fade-in">
        <div className="glass rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent p-8">
          {StepIndicator()}

          {step === 1 && Step1()}
          {step === 2 && Step2()}
          {step === 3 && Step3()}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                if (step === 1) router.push('/projects')
                else if (step === 2) { setStep(1); setRows([]); setFileName('') }
                else setStep(2)
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {step === 1 ? 'Back to Projects' : 'Back'}
            </button>

            {step === 1 && null}
            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                disabled={validRows.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {step === 3 && !summary && (
              <button
                onClick={handleImport}
                disabled={importing || !projectName.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {importing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Start Import</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
