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
import { ArrowUpDown, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, PlayCircle, X } from 'lucide-react'

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
import { useIsMobile } from '@/hooks/use-mobile'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'

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

const MOBILE_COL_WIDTHS: Record<string, number> = {
	priority: 76,
	status: 90
}

function getColumns(enclosureName: string, isMobile: boolean): ColumnDef<Task>[] {
	const all: ColumnDef<Task>[] = [
		{
			id: 'enclosure_name',
			accessorKey: 'enclosure_name',
			header: enclosureName,
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
			id: 'description',
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
		},
		{
			id: 'actions',
			header: '',
			cell: ({ row }) => {
				const status = row.original.status
				const isCompleted = status === 'completed'
				const isInProgress = status === 'in_progress'
				return (
					<div className='flex items-center gap-1'>
						<Button
							variant='ghost'
							size='icon'
							className='h-10 w-10 text-muted-foreground hover:text-blue-500'
							disabled={isCompleted || isInProgress}
							title='Start task'
						>
							<PlayCircle className='h-6 w-6' />
						</Button>
						{isInProgress && (
							<Button
								variant='ghost'
								size='icon'
								className='h-10 w-10 text-muted-foreground hover:text-green-500'
								title='Mark complete'
							>
								<CheckCircle2 className='h-8 w-8' />
							</Button>
						)}
					</div>
				)
			}
		}
	]
	return isMobile
		? all.filter((col) => col.id !== 'enclosure_name' && col.id !== 'description' && col.id !== 'actions')
		: all
}

const TARGET_VISIBLE_ROWS = 15

/** Returns a YYYY-MM-DD string for a date offset from today */
function getDateStr(dayOffset: number): string {
	const d = new Date()
	d.setDate(d.getDate() + dayOffset)
	return d.toISOString().slice(0, 10)
}

function getDayLabel(dayOffset: number): string {
	if (dayOffset === 0) return 'Today'
	if (dayOffset === -1) return 'Yesterday'
	if (dayOffset === 1) return 'Tomorrow'
	const d = new Date()
	d.setDate(d.getDate() + dayOffset)
	return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function TasksDataTable({ enclosureId, orgId }: { enclosureId: UUID; orgId: UUID }) {
	const isMobile = useIsMobile()
	const [dayOffset, setDayOffset] = React.useState(0)
	const [sorting, setSorting] = React.useState<SortingState>([])
	const [globalFilter, setGlobalFilter] = React.useState('')
	const [priorityFilter, setPriorityFilter] = React.useState<string[]>([])
	const [statusFilter, setStatusFilter] = React.useState<string[]>([])
	const [tableHeight, setTableHeight] = React.useState(600)
	const [selectedTask, setSelectedTask] = React.useState<Task | null>(null)
	const [taskDrawerOpen, setTaskDrawerOpen] = React.useState(false)

	const rowRef = React.useRef<HTMLTableRowElement | null>(null)
	const measuredRef = React.useRef(false)

	const hasActiveFilters = priorityFilter.length > 0 || statusFilter.length > 0 || globalFilter !== ''

	const resetFilters = () => {
		setPriorityFilter([])
		setStatusFilter([])
		setGlobalFilter('')
	}

	const { data: enclosureTasks } = useTasksForEnclosures([enclosureId])
	const { data: enclosure } = useEnclosureById(enclosureId, orgId)

	const columns = React.useMemo(
		() => getColumns(enclosure?.name ?? enclosureId, isMobile),
		[enclosure, enclosureId, isMobile]
	)

	const filteredData = React.useMemo(() => {
		const targetDate = getDateStr(dayOffset)
		const todayDate = getDateStr(0)

		return (enclosureTasks || []).filter((task) => {
			const priorityMatch = priorityFilter.length === 0 || (task.priority && priorityFilter.includes(task.priority))
			const statusMatch = statusFilter.length === 0 || (task.status && statusFilter.includes(task.status))
			if (!priorityMatch || !statusMatch) return false

			const dueDateStr = task.due_date ? task.due_date.slice(0, 10) : null

			if (dayOffset === 0) {
				// Today: due today + overdue (past due, not completed) + high priority not completed
				const dueToday = dueDateStr === todayDate
				const overdue = dueDateStr !== null && dueDateStr < todayDate && task.status !== 'completed'
				const urgent = task.priority === 'high' && task.status !== 'completed'
				return dueToday || overdue || urgent
			}

			// Past or future days: only show tasks due on that exact date
			return dueDateStr === targetDate
		})
	}, [enclosureTasks, priorityFilter, statusFilter, dayOffset])

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

	// Measure a single row's height and compute the table height to fit exactly the visible rows
	React.useEffect(() => {
		if (rowRef.current && !measuredRef.current) {
			const rowHeight = rowRef.current.getBoundingClientRect().height
			if (rowHeight > 0) {
				const visibleRows = Math.min(rows.length, TARGET_VISIBLE_ROWS)
				const computed = Math.ceil(rowHeight * visibleRows) + 49 // +49 for header row
				setTableHeight(computed)
				measuredRef.current = true
			}
		}
	})

	// Reset measurement when data changes (filters, row count, etc.)
	React.useEffect(() => {
		measuredRef.current = false
	}, [filteredData.length, rows.length, sorting])

	return (
		<div className='w-full space-y-4'>
			{/* Day Navigator */}
			<div className='flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2'>
				<Button
					variant='ghost'
					size='sm'
					onClick={() => setDayOffset((d) => d - 1)}
					disabled={dayOffset <= -2}
					className='gap-1'
				>
					<ChevronLeft className='h-4 w-4' />
					{getDayLabel(dayOffset - 1)}
				</Button>
				<div className='text-center'>
					<p className='text-sm font-semibold'>{getDayLabel(dayOffset)}</p>
					<p className='text-xs text-muted-foreground'>{getDateStr(dayOffset)}</p>
					{dayOffset === 0 && (
						<p className='text-xs text-muted-foreground mt-0.5'>Due today · Overdue · High priority</p>
					)}
				</div>
				<Button variant='ghost' size='sm' onClick={() => setDayOffset((d) => d + 1)} className='gap-1'>
					{getDayLabel(dayOffset + 1)}
					<ChevronRight className='h-4 w-4' />
				</Button>
			</div>

			{/* Filters */}
			<div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
				<Input
					placeholder='Search tasks...'
					value={globalFilter}
					onChange={(e) => setGlobalFilter(e.target.value)}
					className='max-w-sm'
				/>

				<div className='flex flex-wrap gap-2'>
					{hasActiveFilters && (
						<Button
							variant='ghost'
							onClick={resetFilters}
							className='gap-1.5 text-muted-foreground hover:text-foreground'
						>
							Reset
							<X className='h-4 w-4' />
						</Button>
					)}

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
									onSelect={(e) => e.preventDefault()}
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
									onSelect={(e) => e.preventDefault()}
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
					<div className='flex items-center justify-center h-24 text-muted-foreground text-sm'>
						No tasks for {getDayLabel(dayOffset).toLowerCase()}.
					</div>
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
										className={`border-b transition-colors hover:bg-muted/50 ${isMobile ? 'cursor-pointer active:bg-muted' : ''}`}
										onClick={() => {
											if (isMobile) {
												setSelectedTask(row.original)
												setTaskDrawerOpen(true)
											}
										}}
									>
										{row.getVisibleCells().map((cell) => (
											<td
												key={cell.id}
												style={
													isMobile && MOBILE_COL_WIDTHS[cell.column.id]
														? { width: MOBILE_COL_WIDTHS[cell.column.id], minWidth: MOBILE_COL_WIDTHS[cell.column.id] }
														: undefined
												}
												className={`${isMobile ? 'py-6 px-2' : 'p-4'} align-middle [&:has([role=checkbox])]:pr-0`}
											>
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
											style={
												isMobile && MOBILE_COL_WIDTHS[header.id]
													? { width: MOBILE_COL_WIDTHS[header.id], minWidth: MOBILE_COL_WIDTHS[header.id] }
													: undefined
											}
											className={`h-12 ${isMobile ? 'px-2' : 'px-4'} text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0`}
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

			{/* Mobile task detail drawer */}
			{selectedTask && (
				<ResponsiveDialogDrawer
					title={selectedTask.name ?? 'Task'}
					description={selectedTask.description ?? ''}
					trigger={null}
					open={taskDrawerOpen}
					onOpenChange={(open) => {
						setTaskDrawerOpen(open)
						if (!open) setSelectedTask(null)
					}}
				>
					<div className='flex flex-col gap-4 pt-2'>
						<div className='flex items-center gap-3'>
							{(() => {
								const p = selectedTask.priority ?? ''
								const cfg = priorityConfig[p] || { color: 'bg-gray-100 text-gray-800' }
								return (
									<span className={`px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
										{getPriorityLevelStatus(p) ?? p}
									</span>
								)
							})()}
							{(() => {
								const s = selectedTask.status ?? ''
								const cfg = statusConfig[s] || { label: s, color: 'bg-gray-100 text-gray-800' }
								return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
							})()}
						</div>
						{selectedTask.description && (
							<div className='rounded-md bg-muted p-3'>
								<p className='text-xs font-medium text-muted-foreground mb-1'>Description</p>
								<p className='text-sm leading-relaxed'>{selectedTask.description}</p>
							</div>
						)}
						{selectedTask.due_date && (
							<p className='text-xs text-muted-foreground'>Due: {selectedTask.due_date.slice(0, 10)}</p>
						)}
						<div className='flex gap-2 pt-2'>
							{selectedTask.status !== 'completed' && selectedTask.status !== 'in_progress' && (
								<Button className='flex-1 gap-2'>
									<PlayCircle className='h-5 w-5' /> Start Task
								</Button>
							)}
							{selectedTask.status === 'in_progress' && (
								<Button className='flex-1 gap-2' variant='secondary'>
									<CheckCircle2 className='h-5 w-5' /> Mark Complete
								</Button>
							)}
						</div>
					</div>
				</ResponsiveDialogDrawer>
			)}
		</div>
	)
}
