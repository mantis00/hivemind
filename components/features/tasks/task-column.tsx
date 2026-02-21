'use client'

import { cn } from '@/lib/utils'
import type { TaskItem, TaskStatus } from './types'
import { TaskCard } from './task-card'

const statusLabel: Record<TaskStatus, string> = {
	todo: 'To-Do',
	in_progress: 'In Progress',
	completed: 'Completed'
}

const statusAccent: Record<TaskStatus, string> = {
	todo: 'bg-sky-500',
	in_progress: 'bg-amber-400',
	completed: 'bg-emerald-400'
}

export function TaskColumn({
	status,
	tasks,
	className
}: {
	status: TaskStatus
	tasks: TaskItem[]
	className?: string
}) {
	return (
		<div className={cn('relative rounded-xl border bg-muted/20 p-4', className)}>
			<div className={cn('absolute left-3 top-3 h-10 w-1 rounded-full', statusAccent[status])} />
			<div className='mb-4 text-center'>
				<span className='rounded-md bg-background px-4 py-1 text-sm font-semibold shadow-sm'>
					{statusLabel[status]}
				</span>
			</div>
			<div className='space-y-3'>
				{tasks.map((task) => (
					<TaskCard key={task.id} task={task} />
				))}
			</div>
		</div>
	)
}
