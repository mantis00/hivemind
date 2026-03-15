import type { Task } from '@/lib/react-query/queries'
import { getDateStr } from '@/context/task-day'
import { toLocalDate } from '@/context/to-local-date'

/** Returns the effective display status, promoting past-due tasks to 'late' client-side. */
export function getEffectiveStatus(task: Task): string {
	if (task.status === 'completed' || task.status === 'late') return task.status
	if (task.due_date && toLocalDate(task.due_date) < getDateStr(0)) return 'late'
	return task.status ?? 'pending'
}

export const priorityConfig: Record<string, { color: string }> = {
	low: { color: 'bg-blue-100 text-blue-800' },
	medium: { color: 'bg-yellow-100 text-yellow-800' },
	high: { color: 'bg-red-100 text-red-800' }
}

export const statusConfig: Record<string, { label: string; color: string }> = {
	pending: { label: 'Pending', color: 'bg-gray-100 text-gray-800' },
	late: { label: 'Late', color: 'bg-orange-100 text-orange-800' },
	completed: { label: 'Completed', color: 'bg-green-100 text-green-800' }
}

export const MOBILE_COL_WIDTHS: Record<string, number> = {
	name: 120,
	status: 95,
	due_date: 95,
	description: 150,
	priority: 85,
	assigned_to: 130,
	enclosure_name: 140,
	species: 115,
	created_at: 125,
	completed_by: 140,
	on_schedule: 100
}

export const DESKTOP_COL_WIDTHS: Record<string, number> = {
	name: 170,
	due_date: 120,
	priority: 110,
	status: 120,
	assigned_to: 170,
	created_at: 140,
	completed_by: 160,
	on_schedule: 120
}

export const DEFAULT_COLUMN_LABELS: Record<string, string> = {
	name: 'Task Name',
	status: 'Status',
	due_date: 'Due Date',
	description: 'Description',
	priority: 'Priority',
	assigned_to: 'Assigned To',
	enclosure_name: 'Enclosure',
	species: 'Species'
}

export interface OptionalColumnDef {
	id: string
	label: string
}

export const OPTIONAL_COLUMNS: OptionalColumnDef[] = [
	{ id: 'created_at', label: 'Created At' },
	{ id: 'completed_by', label: 'Completed By' },
	{ id: 'on_schedule', label: 'On Schedule' }
]
