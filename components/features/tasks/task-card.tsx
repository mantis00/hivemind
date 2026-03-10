'use client'

import type { Task } from '@/lib/react-query/queries'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type TaskCardProps = {
	task: Task
	enclosureName: string
}

function formatDate(value: string | null) {
	if (!value) {
		return 'No due date'
	}

	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) {
		return value
	}

	return parsed.toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	})
}

function normalizePriority(priority: string | null) {
	return (priority ?? '').trim().toLowerCase()
}

function priorityBadgeClass(priority: string | null) {
	const normalized = normalizePriority(priority)
	if (normalized === 'high') {
		return 'bg-red-100 text-red-800 border-red-300'
	}

	if (normalized === 'medium') {
		return 'bg-amber-100 text-amber-800 border-amber-300'
	}

	if (normalized === 'low') {
		return 'bg-sky-100 text-sky-800 border-sky-300'
	}

	return 'bg-muted text-muted-foreground border-border'
}

function getTaskTitle(task: Task) {
	if (task.name && task.name.trim().length > 0) {
		return task.name.trim()
	}

	if (task.description && task.description.trim().length > 0) {
		return task.description.trim()
	}

	return 'Untitled task'
}

export function TaskCard({ task, enclosureName }: TaskCardProps) {
	const taskStatus = task.status ?? 'pending'
	const priorityLabel = task.priority ?? 'none'

	return (
		<article className='rounded-lg border bg-card px-3 py-3 shadow-sm'>
			<div className='space-y-2'>
				<p className='text-sm font-semibold leading-tight'>{getTaskTitle(task)}</p>
				<p className='text-xs text-muted-foreground'>Enclosure: {enclosureName}</p>
			</div>

			<div className='mt-3 flex flex-wrap items-center gap-2'>
				<Badge variant='outline' className={cn('border', priorityBadgeClass(task.priority))}>
					{priorityLabel}
				</Badge>
				<Badge variant='outline'>{taskStatus}</Badge>
				<Badge variant='secondary'>Due: {formatDate(task.due_date)}</Badge>
			</div>
		</article>
	)
}
