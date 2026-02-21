'use client'

import type { DashboardTask } from './types'

export function UrgentTaskRow({ task }: { task: DashboardTask }) {
	return (
		<div className='grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center gap-4 rounded-md border bg-muted/40 px-4 py-3 text-sm'>
			<div className='font-medium'>{task.title}</div>
			<div>{task.tank}</div>
			<div>{task.caretaker}</div>
			<div className='text-muted-foreground'>{task.status === 'todo' ? 'To do' : 'In Progress'}</div>
			<div className='flex items-center justify-between'>
				<span className='text-muted-foreground'>{task.dueLabel}</span>
				{task.priority && <span className='text-xs font-semibold text-red-500'>PRIORITY</span>}
			</div>
		</div>
	)
}
