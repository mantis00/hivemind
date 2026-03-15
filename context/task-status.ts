import type { Task } from '@/lib/react-query/queries'
import { getDateStr } from '@/context/task-day'

/** Returns the effective display status, promoting past-due tasks to 'late' client-side. */
export function getEffectiveStatus(task: Task): string {
	if (task.status === 'completed' || task.status === 'late') return task.status
	if (task.due_date && task.due_date.slice(0, 10) < getDateStr(0)) return 'late'
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
	name: 150,
	status: 100,
	due_date: 100
}

export const DESKTOP_COL_WIDTHS: Record<string, number> = {
	name: 220,
	due_date: 120,
	priority: 110,
	status: 120,
	assigned_to: 200
}
