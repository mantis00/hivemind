'use client'

import { ActivityFeed } from './activity-feed'
import { DashboardSummary } from './dashboard-summary'
import { UrgentTaskRow } from './urgent-task-row'
import type { ActivityItem, DashboardTask } from './types'

const mockTasks: DashboardTask[] = [
	{
		id: 't1',
		title: 'Change Bedding',
		tank: 'Tank 7',
		caretaker: 'Caretaker',
		status: 'in_progress',
		dueLabel: 'Due two days ago',
		priority: true
	},
	{
		id: 't2',
		title: 'Feed x',
		tank: 'Tank 7',
		caretaker: 'Caretaker',
		status: 'in_progress',
		dueLabel: 'Due one day ago',
		priority: true
	},
	{
		id: 't3',
		title: 'Task',
		tank: 'Tank X',
		caretaker: 'Caretaker',
		status: 'todo',
		dueLabel: 'Due today'
	},
	{
		id: 't4',
		title: 'Task',
		tank: 'Tank X',
		caretaker: 'Caretaker',
		status: 'in_progress',
		dueLabel: 'Due today'
	},
	{
		id: 't5',
		title: 'Task',
		tank: 'Tank X',
		caretaker: 'Caretaker',
		status: 'in_progress',
		dueLabel: 'Due today'
	}
]

const mockActivity: ActivityItem[] = [
	{ id: 'a1', timestamp: '10:04 AM', name: 'Jane', event: 'Note added' },
	{ id: 'a2', timestamp: '11:22 AM', name: 'John', event: 'Task completed' },
	{ id: 'a3', timestamp: '12:10 PM', name: 'Chris', event: 'Feeding logged' },
	{ id: 'a4', timestamp: '01:02 PM', name: 'Ava', event: 'Enclosure updated' },
	{ id: 'a5', timestamp: '02:18 PM', name: 'Kai', event: 'Alert cleared' }
]

export function DashboardPage() {
	return (
		<div className='space-y-4'>
			<DashboardSummary />

			<div className='rounded-xl border bg-muted/20 p-4 space-y-3'>
				<div className='flex items-center justify-between'>
					<h2 className='text-lg font-semibold'>Urgent Tasks and To-do</h2>
					<span className='text-sm text-muted-foreground'>{new Date().toLocaleString()}</span>
				</div>
				<div className='space-y-2'>
					{mockTasks.map((task) => (
						<UrgentTaskRow key={task.id} task={task} />
					))}
				</div>
			</div>

			<div className='rounded-xl border bg-muted/20 p-4 space-y-2'>
				<div className='flex items-center justify-between'>
					<h3 className='text-sm font-semibold'>Activity Feed</h3>
					<button type='button' className='text-xs text-red-500'>
						View All &gt;
					</button>
				</div>
				<ActivityFeed items={mockActivity} />
			</div>
		</div>
	)
}
