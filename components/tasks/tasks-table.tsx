'use client'

import * as React from 'react'
import {
	ColumnDef,
	SortingState,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	useReactTable
} from '@tanstack/react-table'
import { TableVirtuoso } from 'react-virtuoso'
import { ArrowUpDown, ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import type { Task } from '@/lib/react-query/queries'
import { useTasksForEnclosures, useEnclosureById } from '@/lib/react-query/queries'
import { UUID } from 'crypto'
import getPriorityLevelStatus from '@/context/priority-levels'

const priorityConfig: Record<string, { color: string }> = {
	low: { color: 'bg-blue-100 text-blue-800' },
	medium: { color: 'bg-yellow-100 text-yellow-800' },
	high: { color: 'bg-red-100 text-red-800' }
}

const statusConfig: Record<string, { label: string; color: string }> = {
	pending: { label: 'Pending', color: 'bg-gray-100 text-gray-800' },
	'in-progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
	completed: { label: 'Completed', color: 'bg-green-100 text-green-800' }
}

function getColumns(enclosureName: string): ColumnDef<Task>[] {
	return [
		{
			accessorKey: 'enclosure_id',
			header: 'Enclosure',
			cell: () => <div className='font-medium'>{enclosureName}</div>
		},
		{
			accessorKey: 'name',
			header: ({ column }) => (
				<Button
					variant='ghost'
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
					className='h-8 p-0'
				>
					Task Name
					<ArrowUpDown className='ml-2 h-4 w-4' />
				</Button>
			),
			cell: ({ row }) => <div className='font-medium'>{row.getValue('name')}</div>
		},
		{
			accessorKey: 'description',
			header: 'Description',
			cell: ({ row }) => (
				<div className='max-w-xs truncate text-sm text-muted-foreground'>{row.getValue('description')}</div>
			)
		},
		{
			accessorKey: 'priority',
			header: ({ column }) => (
				<Button
					variant='ghost'
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
					className='h-8 p-0'
				>
					Priority
					<ArrowUpDown className='ml-2 h-4 w-4' />
				</Button>
			),
			cell: ({ row }) => {
				const priority = row.getValue('priority') as string
				const config = priorityConfig[priority] || { color: 'bg-gray-100 text-gray-800' }
				const label = getPriorityLevelStatus(priority) ?? priority
				return (
					<div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>{label}</div>
				)
			}
		},
		{
			accessorKey: 'status',
			header: ({ column }) => (
				<Button
					variant='ghost'
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
					className='h-8 p-0'
				>
					Status
					<ArrowUpDown className='ml-2 h-4 w-4' />
				</Button>
			),
			cell: ({ row }) => {
				const status = row.getValue('status') as string
				const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
				return (
					<div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
						{config.label}
					</div>
				)
			}
		}
	]
}

const TARGET_VISIBLE_ROWS = 15

export function TasksDataTable({ enclosureId }: { enclosureId: UUID }) {
	const [sorting, setSorting] = React.useState<SortingState>([])
	const [globalFilter, setGlobalFilter] = React.useState('')
	const [priorityFilter, setPriorityFilter] = React.useState<string[]>([])
	const [statusFilter, setStatusFilter] = React.useState<string[]>([])
	const [tableHeight, setTableHeight] = React.useState(600)

	const rowRef = React.useRef<HTMLTableRowElement | null>(null)
	const measuredRef = React.useRef(false)

	const { data: enclosureTasks } = useTasksForEnclosures([enclosureId])
	const { data: enclosure } = useEnclosureById(enclosureId)

	const columns = React.useMemo(() => getColumns(enclosure?.name ?? enclosureId), [enclosure, enclosureId])

	const filteredData = React.useMemo(() => {
		return (enclosureTasks || []).filter((task) => {
			const priorityMatch = priorityFilter.length === 0 || (task.priority && priorityFilter.includes(task.priority))
			const statusMatch = statusFilter.length === 0 || (task.status && statusFilter.includes(task.status))
			return priorityMatch && statusMatch
		})
	}, [enclosureTasks, priorityFilter, statusFilter])

	const table = useReactTable({
		data: filteredData,
		columns,
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		globalFilterFn: 'includesString',
		state: {
			sorting,
			globalFilter
		},
		onGlobalFilterChange: setGlobalFilter
	})

	const { rows } = table.getRowModel()

	// Measure a single row's height and compute the table max-height for ~15 visible rows
	React.useEffect(() => {
		if (rowRef.current && !measuredRef.current) {
			const rowHeight = rowRef.current.getBoundingClientRect().height
			if (rowHeight > 0) {
				const computed = Math.ceil(rowHeight * TARGET_VISIBLE_ROWS)
				setTableHeight(computed)
				measuredRef.current = true
			}
		}
	})

	// Reset measurement when data changes significantly (filters, etc.)
	React.useEffect(() => {
		measuredRef.current = false
	}, [filteredData.length, sorting])

	return (
		<div className='w-full space-y-4'>
			{/* Filters */}
			<div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
				<Input
					placeholder='Search tasks...'
					value={globalFilter}
					onChange={(e) => setGlobalFilter(e.target.value)}
					className='max-w-sm'
				/>

				<div className='flex flex-wrap gap-2'>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant='outline' className='gap-2'>
								Priority {priorityFilter.length > 0 && `(${priorityFilter.length})`}
								<ChevronDown className='h-4 w-4' />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align='end'>
							{(['low', 'medium', 'high'] as const).map((priority) => (
								<DropdownMenuCheckboxItem
									key={priority}
									checked={priorityFilter.includes(priority)}
									onCheckedChange={(checked) => {
										setPriorityFilter((prev) => (checked ? [...prev, priority] : prev.filter((p) => p !== priority)))
									}}
								>
									{getPriorityLevelStatus(priority)}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant='outline' className='gap-2'>
								Status {statusFilter.length > 0 && `(${statusFilter.length})`}
								<ChevronDown className='h-4 w-4' />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align='end'>
							{['pending', 'in-progress', 'completed'].map((status) => (
								<DropdownMenuCheckboxItem
									key={status}
									checked={statusFilter.includes(status)}
									onCheckedChange={(checked) => {
										setStatusFilter((prev) => (checked ? [...prev, status] : prev.filter((s) => s !== status)))
									}}
								>
									{statusConfig[status].label}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{/* Virtuoso Table */}
			<div className='rounded-lg border border-border/50 overflow-hidden bg-card/60 backdrop-blur-sm'>
				{rows.length === 0 ? (
					<div className='flex items-center justify-center h-24 text-muted-foreground'>No results.</div>
				) : (
					<TableVirtuoso
						style={{ height: tableHeight }}
						totalCount={rows.length}
						components={{
							Table: ({ style, ...props }) => (
								<table
									{...props}
									style={{ ...style, width: '100%', borderCollapse: 'collapse' }}
									className='w-full caption-bottom text-sm'
								/>
							),
							TableHead: React.forwardRef(function VirtuosoTHead(props, ref) {
								return <thead ref={ref} {...props} className='[&_tr]:border-b' />
							}),
							TableRow: ({ style, ...props }) => {
								const index = props['data-index'] as number
								const row = rows[index]
								return (
									<tr
										{...props}
										ref={index === 0 ? rowRef : undefined}
										style={style}
										className='border-b transition-colors hover:bg-muted/50'
									>
										{row.getVisibleCells().map((cell) => (
											<td key={cell.id} className='p-4 align-middle [&:has([role=checkbox])]:pr-0'>
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</td>
										))}
									</tr>
								)
							},
							TableBody: React.forwardRef(function VirtuosoTBody(props, ref) {
								return <tbody ref={ref} {...props} className='[&_tr:last-child]:border-0' />
							})
						}}
						fixedHeaderContent={() =>
							table.getHeaderGroups().map((headerGroup) => (
								<tr key={headerGroup.id} className='border-b bg-muted/40 backdrop-blur-sm'>
									{headerGroup.headers.map((header) => (
										<th
											key={header.id}
											className='h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0'
										>
											{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
										</th>
									))}
								</tr>
							))
						}
					/>
				)}
			</div>

			{/* Row count */}
			<div className='text-sm text-muted-foreground'>
				{rows.length} of {(enclosureTasks || []).length} tasks
			</div>
		</div>
	)
}
