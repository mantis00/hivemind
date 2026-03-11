'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ArrowRight, ArrowUpDown } from 'lucide-react'
import { UUID } from 'crypto'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Task, MemberProfile, Enclosure, OrgSpecies } from '@/lib/react-query/queries'
import { ReassignMemberButton } from './reassign-member-button'
import capitalizeFirstLetter from '@/context/captalize-first-letter'
import { formatDate } from '@/context/format-date'
import { getEffectiveStatus, priorityConfig, statusConfig } from '@/context/task-status'

export function getColumns(
	isMobile: boolean,
	onView: (taskId: UUID) => void,
	members: MemberProfile[],
	columnIds?: string[],
	enclosures?: Enclosure[],
	orgSpecies?: OrgSpecies[],
	onViewEnclosure?: (enclosureId: UUID) => void
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
						<button
							className='text-sm font-medium text-primary hover:underline'
							onClick={(e) => {
								e.stopPropagation()
								onViewEnclosure(enc.id as UUID)
							}}
						>
							{enc.name}
						</button>
					)
				}
				return <span className='text-sm'>{enc.name}</span>
			}
		},
		{
			id: 'species',
			header: () => <span className='font-bold'>Species</span>,
			cell: ({ row }) => {
				const enc = enclosureMap.get(row.original.enclosure_id as string)
				const spec = enc ? speciesMap.get(enc.species_id as string) : undefined
				if (!spec) return <span className='text-xs text-muted-foreground'>—</span>
				return <span className='text-sm'>{spec.custom_common_name}</span>
			}
		},
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
									<div className='font-medium truncate max-w-[160px] cursor-default'>{name.slice(0, 20)}…</div>
								</TooltipTrigger>
								<TooltipContent>{name}</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)
				}
				return <div className='font-medium truncate max-w-[160px]'>{name}</div>
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
									<div className='max-w-[240px] truncate text-sm text-muted-foreground cursor-default'>
										{desc.slice(0, 30)}…
									</div>
								</TooltipTrigger>
								<TooltipContent className='max-w-xs'>{desc}</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)
				}
				return <div className='max-w-[240px] truncate text-sm text-muted-foreground'>{desc}</div>
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

	if (columnIds) {
		return columnIds
			.map((id) => all.find((col) => (col.id ?? (col as { accessorKey?: string }).accessorKey) === id))
			.filter(Boolean) as ColumnDef<Task>[]
	}

	const enclosureOnlyIds = new Set(['enclosure_name', 'species'])
	const defaultCols = all.filter(
		(col) => !enclosureOnlyIds.has(col.id ?? (col as { accessorKey?: string }).accessorKey ?? '')
	)

	if (isMobile) {
		const mobileOrder = ['name', 'status', 'due_date']
		return mobileOrder.map(
			(id) => defaultCols.find((col) => (col.id ?? (col as { accessorKey?: string }).accessorKey) === id)!
		)
	}

	return defaultCols
}
