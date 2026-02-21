'use client'

import { useMemo } from 'react'
import type { TaskItem, TaskStatus } from './types'
import { TaskColumn } from './task-column'
import { TaskFilters } from './task-filters'

const mockTasks: TaskItem[] = [
	{ id: 't1', title: 'Change Bedding', caretaker: 'Caretaker', tank: 'Tank 7', status: 'in_progress' },
	{ id: 't2', title: 'Feed Colony', caretaker: 'Caretaker', tank: 'Tank 7', status: 'todo' },
	{ id: 't3', title: 'Mist Habitat', caretaker: 'Caretaker', tank: 'Tank 12', status: 'todo' },
	{ id: 't4', title: 'Spot Clean', caretaker: 'Caretaker', tank: 'Tank 3', status: 'in_progress' },
	{ id: 't5', title: 'Record Count', caretaker: 'Caretaker', tank: 'Tank 18', status: 'completed' },
	{ id: 't6', title: 'Replace Substrate', caretaker: 'Caretaker', tank: 'Tank 22', status: 'todo' },
	{ id: 't7', title: 'Check Humidity', caretaker: 'Caretaker', tank: 'Tank 31', status: 'completed' },
	{ id: 't8', title: 'Refill Water', caretaker: 'Caretaker', tank: 'Tank 12', status: 'in_progress' }
]

function splitByStatus(tasks: TaskItem[], status: TaskStatus) {
	return tasks.filter((task) => task.status === status)
}

export function TasksPage() {
	const todo = useMemo(() => splitByStatus(mockTasks, 'todo'), [])
	const inProgress = useMemo(() => splitByStatus(mockTasks, 'in_progress'), [])
	const completed = useMemo(() => splitByStatus(mockTasks, 'completed'), [])

	return (
		<div className='space-y-4'>
			<TaskFilters />
			<div className='grid gap-4 lg:grid-cols-3'>
				<TaskColumn status='todo' tasks={todo} className='min-h-[520px]' />
				<TaskColumn status='in_progress' tasks={inProgress} className='min-h-[520px]' />
				<TaskColumn status='completed' tasks={completed} className='min-h-[520px]' />
			</div>
		</div>
	)
}
