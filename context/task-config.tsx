import type { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
	select: 36,
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

/** Columns that are defaults on enclosure-tasks but extra/toggleable on org-tasks */
export const ORG_OPTIONAL_COLUMNS: OptionalColumnDef[] = [
	{ id: 'description', label: 'Description' },
	{ id: 'priority', label: 'Priority' }
]

/** Extra columns available in all modes */
export const OPTIONAL_COLUMNS: OptionalColumnDef[] = [
	{ id: 'created_at', label: 'Created At' },
	{ id: 'completed_by', label: 'Completed By' },
	{ id: 'on_schedule', label: 'On Schedule' }
]

/**
 * Truncates text at maxChars and returns the string.
 * Use for elements that already have their own tooltip (e.g. enclosure button).
 */
export function truncateText(text: string | null | undefined, maxChars = 26): string {
	if (!text) return '—'
	return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text
}

/**
 * Renders text truncated at maxChars.
 * If truncated, wraps in a tooltip that shows the full text.
 * Use for Species, Task Name, Description, and similar columns.
 */
export function renderTruncatedWithTooltip(
	text: string | null | undefined,
	maxChars = 28,
	className = 'text-sm'
): ReactNode {
	if (!text) return <span className='text-xs text-muted-foreground'>—</span>
	if (text.length <= maxChars) return <span className={className}>{text}</span>
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<span className={`${className} cursor-default`}>{text.slice(0, maxChars)}…</span>
				</TooltipTrigger>
				<TooltipContent align='start' className='max-w-60 text-left text-xs'>
					{text}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}
