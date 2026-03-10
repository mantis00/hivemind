'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ArrowRight, ArrowUpDown } from 'lucide-react'
import { UUID } from 'crypto'

import { Button } from '@/components/ui/button'
import type { Task, MemberProfile } from '@/lib/react-query/queries'
import { ReassignMemberButton } from './reassign-member-button'
import capitalizeFirstLetter from '@/context/captalize-first-letter'
import { getDateStr } from '@/context/task-day'
import { formatDate } from '@/context/format-date'
import { getEffectiveStatus, priorityConfig, statusConfig } from '@/context/task-status'

export function getColumns(
	isMobile: boolean,
	onView: (taskId: UUID) => void,
	members: MemberProfile[]
): ColumnDef<Task>[] {
	const memberMap = new Map(members.map((m) => [m.id as string, m]))

	const all: ColumnDef<Task>[] = [
		{
			accessorKey: 'name',
			header: ({ column }) => (
				<button
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
					className='flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors'
				>
					Task Name
					<ArrowUpDown className='h-4 w-4' />
				</button>
			),
			cell: ({ row }) => <div className='font-medium truncate'>{row.getValue('name')}</div>
		},
		{
			id: 'description',
			accessorKey: 'description',
			header: 'Description',
			cell: ({ row }) => {
				const task = row.original
				const desc = task.description ?? task.task_templates?.description
				return <div className='max-w-xs truncate text-sm text-muted-foreground'>{desc}</div>
			}
		},
		{
			accessorKey: 'priority',
			header: ({ column }) => (
				<button
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
					className='flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors'
				>
					Priority
					<ArrowUpDown className='h-4 w-4' />
				</button>
			),
			cell: ({ row }) => {
				const priority = row.getValue('priority') as string | null
				if (!priority) return <span className='text-xs text-muted-foreground'>—</span>
				const config = priorityConfig[priority] || { color: 'bg-gray-100 text-gray-800' }
				return (
					<div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
						{capitalizeFirstLetter(priority)}
					</div>
				)
			}
		},
		{
			accessorKey: 'status',
			header: ({ column }) => (
				<button
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
					className='flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors'
				>
					Status
					<ArrowUpDown className='h-4 w-4' />
				</button>
			),
			cell: ({ row }) => {
				const status = getEffectiveStatus(row.original)
				const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
				return (
					<div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
						{config.label}
					</div>
				)
			}
		},
		{
			id: 'due_date',
			header: 'Due Date',
			cell: ({ row }) => {
				const due = row.original.due_date
				if (!due) return <span className='text-xs text-muted-foreground'>—</span>
				const isToday = due.slice(0, 10) === getDateStr(0)
				return (
					<span
						className={`text-xs whitespace-nowrap ${isToday ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}
					>
						{formatDate(due)}
					</span>
				)
			}
		},
		{
			id: 'assigned_to',
			header: 'Assigned To',
			cell: ({ row }) => {
				const task = row.original
				const member = task.assigned_to ? memberMap.get(task.assigned_to as string) : null
				const name = member ? member.full_name || `${member.first_name} ${member.last_name}`.trim() : null
				return (
					<div onClick={(e) => e.stopPropagation()}>
						<ReassignMemberButton
							taskId={task.id as UUID}
							assignedTo={task.assigned_to}
							assignedMemberName={name}
							members={members}
						/>
					</div>
				)
			}
		},
		{
			id: 'actions',
			header: '',
			cell: ({ row }) => (
				<div className='flex items-center gap-1'>
					<Button
						variant='ghost'
						size='icon'
						className='h-8 w-8 text-muted-foreground hover:text-primary'
						onClick={(e) => {
							e.stopPropagation()
							onView(row.original.id as UUID)
						}}
					>
						<ArrowRight className='h-4 w-4' />
					</Button>
				</div>
			)
		}
	]

	if (isMobile) {
		const mobileOrder = ['name', 'status', 'due_date']
		return mobileOrder.map((id) => all.find((col) => (col.id ?? (col as { accessorKey?: string }).accessorKey) === id)!)
	}

	return all
}
