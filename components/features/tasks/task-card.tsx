'use client'

//import { cn } from '@/lib/utils'
import type { TaskItem } from './types'

export function TaskCard({ task }: { task: TaskItem }) {
	return (
		<div className='rounded-lg border bg-background px-3 py-3 text-sm shadow-sm'>
			<div className='font-semibold'>{task.title}</div>
			<div className='text-xs text-muted-foreground'>{task.caretaker}</div>
			<div className='text-xs text-muted-foreground'>{task.tank}</div>
		</div>
	)
}
