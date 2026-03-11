'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import { UUID } from 'crypto'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Task, MemberProfile } from '@/lib/react-query/queries'
import { ReassignMemberButton } from './reassign-member-button'
import capitalizeFirstLetter from '@/context/captalize-first-letter'
import { formatDate } from '@/context/format-date'
import { getEffectiveStatus, priorityConfig, statusConfig } from '@/context/task-status'

export function getColumns(isMobile: boolean, members: MemberProfile[]): ColumnDef<Task>[] {
	const memberMap = new Map(members.map((m) => [m.id as string, m]))

	const all: ColumnDef<Task>[] = [
		{
			accessorKey: 'name',
			header: ({ column }) => (
				<button
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
					className='flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors'
				>
					Task Name
					<ArrowUpDown className='h-4 w-4' />
				</button>
			),
			cell: ({ row }) => {
				const name = row.getValue('name') as string
				if (name && name.length > 20) {
					return (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className='font-medium truncate max-w-[160px] cursor-default group-hover:underline'>
										{name.slice(0, 20)}…
									</div>
								</TooltipTrigger>
								<TooltipContent>{name}</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)
				}
				return <div className='font-medium truncate max-w-[160px] group-hover:underline'>{name}</div>
			}
		},
		{
			id: 'description',
			accessorKey: 'description',
			header: () => <span className='font-bold'>Description</span>,
			cell: ({ row }) => {
				const task = row.original
				const desc = task.description ?? task.task_templates?.description
				if (desc && desc.length > 30) {
					return (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className='max-w-[130px] truncate text-sm text-muted-foreground cursor-default group-hover:underline'>
										{desc.slice(0, 30)}…
									</div>
								</TooltipTrigger>
								<TooltipContent className='max-w-xs'>{desc}</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)
				}
				return <div className='max-w-[240px] truncate text-sm text-muted-foreground group-hover:underline'>{desc}</div>
			}
		},
		{
			accessorKey: 'priority',
			header: ({ column }) => (
				<button
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
					className='flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors'
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
					className='flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors'
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
			accessorKey: 'due_date',
			header: ({ column }) => (
				<button
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
					className='flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors'
				>
					Due Date
					<ArrowUpDown className='h-4 w-4' />
				</button>
			),
			cell: ({ row }) => {
				const due = row.original.due_date
				if (!due) return <span className='text-xs text-muted-foreground'>—</span>
				return (
					<span className='text-xs whitespace-nowrap text-muted-foreground group-hover:underline'>
						{formatDate(due)}
					</span>
				)
			}
		},
		{
			id: 'assigned_to',
			header: () => <span className='font-bold'>Assigned To</span>,
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
		}
	]

	if (isMobile) {
		const mobileOrder = ['name', 'status', 'due_date']
		return mobileOrder.map((id) => all.find((col) => (col.id ?? (col as { accessorKey?: string }).accessorKey) === id)!)
	}

	const desktopOrder = ['name', 'description', 'due_date', 'priority', 'status', 'assigned_to']
	return desktopOrder.map((id) => all.find((col) => (col.id ?? (col as { accessorKey?: string }).accessorKey) === id)!)
}
