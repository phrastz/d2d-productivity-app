import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  const wb = XLSX.utils.book_new()

  const headers = ['#', 'Sub-Project', 'Module / Feature', 'Task', 'Status', 'Date From', 'Date To', 'Notes']
  const examples = [
    [1, 'Planning', 'Requirements', 'Gather stakeholder requirements', '⟳ In Progress', '01 Jan 2026', '15 Jan 2026', 'Initial phase'],
    [2, 'Planning', 'Requirements', 'Create project charter', 'todo', '05 Jan 2026', '10 Jan 2026', ''],
    [3, 'Design', 'UI/UX', 'Wireframe homepage', 'todo', '16 Jan 2026', '25 Jan 2026', ''],
    [4, 'Design', 'UI/UX', 'Design system setup', 'todo', '20 Jan 2026', 'TBD', 'Ongoing work'],
    [5, 'Development', 'Frontend', 'Setup Next.js project', '✓ Done', '01 Feb 2026', '02 Feb 2026', ''],
    [6, 'Development', 'Backend', 'Configure Supabase', 'todo', '03 Feb 2026', 'Ongoing', ''],
  ]

  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples])

  // Column widths
  ws['!cols'] = [
    { wch: 5 },   // #
    { wch: 20 },  // Sub-Project
    { wch: 22 },  // Module
    { wch: 35 },  // Task
    { wch: 16 },  // Status
    { wch: 14 },  // Date From
    { wch: 14 },  // Date To
    { wch: 30 },  // Notes
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Import Template')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="DailyFlow_Project_Import_Template.xlsx"',
    },
  })
}
