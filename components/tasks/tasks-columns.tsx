'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, CalendarCheck2 } from 'lucide-react'
import { UUID } from 'crypto'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Task, MemberProfile, Enclosure, OrgSpecies } from '@/lib/react-query/queries'
import { ReassignMemberButton } from './reassign-member-button'
import capitalizeFirstLetter from '@/context/captalize-first-letter'
import { formatDate } from '@/context/format-date'
import {
	getEffectiveStatus,
	priorityConfig,
	statusConfig,
	renderTruncatedWithTooltip,
	truncateText
} from '@/context/task-config'

export function getColumns(
	isMobile: boolean,
	onView: (taskId: UUID) => void,
	members: MemberProfile[],
	columnIds?: string[],
	enclosures?: Enclosure[],
	orgSpecies?: OrgSpecies[],
	onViewEnclosure?: (enclosureId: UUID) => void,
	extraColumnIds: string[] = []
): ColumnDef<Task>[] {
	const memberMap = new Map(members.map((m) => [m.id as string, m]))
	const enclosureMap = new Map((enclosures ?? []).map((e) => [e.id as string, e]))
	const speciesMap = new Map((orgSpecies ?? []).map((s) => [s.id as string, s]))

	const all: ColumnDef<Task>[] = [
		{
			id: 'enclosure_name',
			header: () => <span className='font-bold'>Enclosure</span>,
			cell: ({ row }) => {
				const enc = enclosureMap.get(row.original.enclosure_id as string)
				if (!enc) return <span className='text-xs text-muted-foreground'>—</span>
				if (onViewEnclosure) {
					return (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										className='text-sm font-medium text-primary hover:underline'
										onClick={(e) => {
											e.stopPropagation()
											onViewEnclosure(enc.id as UUID)
										}}
									>
										{enc.name}
									</button>
								</TooltipTrigger>
								<TooltipContent align='start' className='max-w-160 text-left text-xs'>
									You will be redirected to this enclosure&lsquo;s tasks
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)
				}
				return <span className='text-sm'>{truncateText(enc.name, 24)}</span>
			}
		},
		{
			id: 'species',
			header: () => <span className='font-bold'>Species</span>,
			cell: ({ row }) => {
				const enc = enclosureMap.get(row.original.enclosure_id as string)
				const spec = enc ? speciesMap.get(enc.species_id as string) : undefined
				if (!spec) return <span className='text-xs text-muted-foreground'>—</span>
				return renderTruncatedWithTooltip(spec.custom_common_name, 22)
			}
		},
		{
			accessorKey: 'name',
			header: ({ column }) => (
				<button
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
					className='flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap'
				>
					Task Name
					<ArrowUpDown className='h-4 w-4' />
				</button>
			),
			cell: ({ row }) => {
				const name = row.getValue('name') as string
				return renderTruncatedWithTooltip(name, 28, 'font-medium')
			}
		},
		{
			id: 'description',
			header: () => <span className='font-bold'>Description</span>,
			cell: ({ row }) => {
				const task = row.original
				const desc = task.description ?? task.task_templates?.description
				return renderTruncatedWithTooltip(desc, 30, 'text-xs text-muted-foreground')
			}
		},
		{
			accessorKey: 'priority',
			header: ({ column }) => (
				<button
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
					className='flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap'
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
					className='flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap'
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
					className='flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap'
				>
					Due Date
					<ArrowUpDown className='h-4 w-4' />
				</button>
			),
			cell: ({ row }) => {
				const due = row.original.due_date
				if (!due) return <span className='text-xs text-muted-foreground'>—</span>
				return <span className='text-xs whitespace-nowrap text-muted-foreground'>{formatDate(due)}</span>
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
							readOnly={task.status === 'completed'}
						/>
					</div>
				)
			}
		},
		{
			id: 'created_at',
			accessorKey: 'created_at',
			header: ({ column }) => (
				<button
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
					className='flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap'
				>
					Created At
					<ArrowUpDown className='h-4 w-4' />
				</button>
			),
			cell: ({ row }) => {
				const created = row.original.created_at
				if (!created) return <span className='text-xs text-muted-foreground'>—</span>
				return <span className='text-xs whitespace-nowrap text-muted-foreground'>{formatDate(created)}</span>
			}
		},
		{
			id: 'completed_by',
			header: () => <span className='font-bold'>Completed By</span>,
			cell: ({ row }) => {
				const task = row.original
				if (!task.completed_by) return <span className='text-xs text-muted-foreground'>—</span>
				const member = memberMap.get(task.completed_by as string)
				const name = member ? member.full_name || `${member.first_name} ${member.last_name}`.trim() : null
				return <span className='text-xs text-muted-foreground'>{name ?? '—'}</span>
			}
		},
		{
			id: 'on_schedule',
			header: () => <span className='font-bold'>On Schedule</span>,
			cell: ({ row }) => {
				if (!row.original.schedule_id) return <span className='text-xs text-muted-foreground'>—</span>
				return (
					<div className='flex items-center'>
						<CalendarCheck2 className='h-4 w-4 text-green-600 dark:text-green-500' />
					</div>
				)
			}
		}
	]

	const getColById = (id: string) => all.find((col) => (col.id ?? (col as { accessorKey?: string }).accessorKey) === id)

	if (columnIds) {
		const allIds = [...columnIds, ...extraColumnIds.filter((id) => !columnIds.includes(id))]
		return allIds.map(getColById).filter(Boolean) as ColumnDef<Task>[]
	}

	const enclosureOnlyIds = new Set(['enclosure_name', 'species'])
	const defaultCols = all.filter(
		(col) => !enclosureOnlyIds.has(col.id ?? (col as { accessorKey?: string }).accessorKey ?? '')
	)

	const baseOrder = isMobile
		? ['name', 'status', 'due_date']
		: ['name', 'description', 'due_date', 'priority', 'status', 'assigned_to']

	const allOrder = [...baseOrder, ...extraColumnIds.filter((id) => !baseOrder.includes(id))]
	return allOrder
		.map((id) => defaultCols.find((col) => (col.id ?? (col as { accessorKey?: string }).accessorKey) === id))
		.filter(Boolean) as ColumnDef<Task>[]
}
