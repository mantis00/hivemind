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
import {
	ArrowUpDown,
	CheckCircle2,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	LoaderCircle,
	PlayCircle,
	PlusIcon,
	X
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import type { Task } from '@/lib/react-query/queries'
import { useTasksForEnclosures } from '@/lib/react-query/queries'
import { useCompleteTask, useStartTask } from '@/lib/react-query/mutations'
import { UUID } from 'crypto'
import getPriorityLevelStatus from '@/context/priority-levels'
import { useIsMobile } from '@/hooks/use-mobile'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { CreateTaskButton } from './create-task-button'

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

function getColumns(
	isMobile: boolean,
	onStart: (taskId: UUID) => void,
	onComplete: (taskId: UUID) => void
): ColumnDef<Task>[] {
	const all: ColumnDef<Task>[] = [
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
							onClick={() => onStart(row.original.id as UUID)}
						>
							<PlayCircle className='h-6 w-6' />
						</Button>
						{isInProgress && (
							<Button
								variant='ghost'
								size='icon'
								className='h-10 w-10 text-muted-foreground hover:text-green-500'
								title='Mark complete'
								onClick={() => onComplete(row.original.id as UUID)}
							>
								<CheckCircle2 className='h-8 w-8' />
							</Button>
						)}
					</div>
				)
			}
		}
	]
	return isMobile ? all.filter((col) => col.id !== 'description' && col.id !== 'actions') : all
}

const TARGET_VISIBLE_ROWS_MOBILE = 15
const TARGET_VISIBLE_ROWS_DESKTOP = 20

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
	const TARGET_VISIBLE_ROWS = isMobile ? TARGET_VISIBLE_ROWS_MOBILE : TARGET_VISIBLE_ROWS_DESKTOP
	const ESTIMATED_ROW_HEIGHT = isMobile ? 73 : 46
	const [measuredRowHeight, setMeasuredRowHeight] = React.useState<number | null>(null)
	const [selectedTask, setSelectedTask] = React.useState<Task | null>(null)
	const [taskDrawerOpen, setTaskDrawerOpen] = React.useState(false)
	const [user, setUser] = useState<User | null>(null)
	const [isMounted, setIsMounted] = React.useState(false)
	const supabase = createClient()
	const [createTaskOpen, setCreateTaskOpen] = useState(false)

	useEffect(() => {
		setIsMounted(true)
	}, [])

	useEffect(() => {
		const fetchUser = async () => {
			const {
				data: { user }
			} = await supabase.auth.getUser()
			setUser(user)
		}

		fetchUser()
	}, [])

	const rowRef = React.useRef<HTMLTableRowElement | null>(null)
	const measuredRef = React.useRef(false)
	// Stable order map: task id → position. Only updated when the set of IDs changes,
	// so status mutations (start/complete) don't reorder rows.
	const stableOrderRef = React.useRef<Map<string, number>>(new Map())
	// Last known non-zero row count — prevents tableHeight from flashing to ~49px
	const stableRowCountRef = React.useRef(0)

	const hasActiveFilters = priorityFilter.length > 0 || statusFilter.length > 0 || globalFilter !== ''

	const resetFilters = () => {
		setPriorityFilter([])
		setStatusFilter([])
		setGlobalFilter('')
	}

	const { data: enclosureTasks, isLoading: tasksLoading } = useTasksForEnclosures([enclosureId])
	const startTask = useStartTask()
	const completeTask = useCompleteTask()

	// Holds latest mutation objects so callbacks stay stable across mutation state changes
	const startTaskRef = React.useRef(startTask)
	startTaskRef.current = startTask
	const completeTaskRef = React.useRef(completeTask)
	completeTaskRef.current = completeTask

	const handleStart = React.useCallback(
		(taskId: UUID) => startTaskRef.current.mutate({ task_id: taskId, enclosure_id: enclosureId }),
		[enclosureId]
	)

	const handleComplete = React.useCallback(
		(taskId: UUID) =>
			completeTaskRef.current.mutate({ task_id: taskId, enclosure_id: enclosureId, user_id: user?.id as UUID }),
		[enclosureId, user?.id]
	)

	const columns = React.useMemo(
		() => getColumns(isMobile, handleStart, handleComplete),
		[isMobile, handleStart, handleComplete]
	)

	const filteredData = React.useMemo(() => {
		const targetDate = getDateStr(dayOffset)
		const todayDate = getDateStr(0)

		const tasks = (enclosureTasks || []).filter((task) => {
			const priorityMatch = priorityFilter.length === 0 || (task.priority && priorityFilter.includes(task.priority))
			const statusMatch = statusFilter.length === 0 || (task.status && statusFilter.includes(task.status))
			if (!priorityMatch || !statusMatch) return false

			const dueDateStr = task.due_date ? task.due_date.slice(0, 10) : null

			if (dayOffset === 0) {
				// Today: due today + overdue (past due, not completed) + high priority not completed
				// + tasks completed today (shown at bottom)
				const dueToday = dueDateStr === todayDate
				const overdue = dueDateStr !== null && dueDateStr < todayDate && task.status !== 'completed'
				const urgent = task.priority === 'high' && task.status !== 'completed'
				const completedToday =
					task.status === 'completed' && task.completed_time != null && task.completed_time.slice(0, 10) === todayDate
				return dueToday || overdue || urgent || completedToday
			}

			// Past or future days: only show tasks due on that exact date
			return dueDateStr === targetDate
		})

		// Update stable order for any task IDs not yet seen
		tasks.forEach((task) => {
			const id = task.id as string
			if (!stableOrderRef.current.has(id)) {
				stableOrderRef.current.set(id, stableOrderRef.current.size)
			}
		})

		if (dayOffset === 0) {
			// Sort: non-completed in stable order, completed at the bottom in stable order
			return [...tasks].sort((a, b) => {
				const aCompleted = a.status === 'completed' ? 1 : 0
				const bCompleted = b.status === 'completed' ? 1 : 0
				if (aCompleted !== bCompleted) return aCompleted - bCompleted
				const aPos = stableOrderRef.current.get(a.id as string) ?? 999
				const bPos = stableOrderRef.current.get(b.id as string) ?? 999
				return aPos - bPos
			})
		}

		return tasks
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

	if (rows.length > 0) stableRowCountRef.current = rows.length
	const displayRowCount = rows.length > 0 ? rows.length : stableRowCountRef.current
	const tableHeight =
		Math.ceil((measuredRowHeight ?? ESTIMATED_ROW_HEIGHT) * Math.min(displayRowCount, TARGET_VISIBLE_ROWS)) + 49 // +49 for header row

	// Measure a single row's height and refine the table height
	React.useLayoutEffect(() => {
		if (rowRef.current && !measuredRef.current) {
			const rowHeight = rowRef.current.getBoundingClientRect().height
			if (rowHeight > 0) {
				setMeasuredRowHeight(rowHeight)
				measuredRef.current = true
			}
		}
	})

	// Reset stable order when the day changes (different task set)
	React.useEffect(() => {
		stableOrderRef.current = new Map()
	}, [dayOffset])

	// Reset measurement when sort order changes so height recomputes
	React.useEffect(() => {
		measuredRef.current = false
	}, [sorting])

	if (!isMounted || tasksLoading) {
		return (
			<div className='flex items-center justify-center h-48 w-full'>
				<LoaderCircle className='h-8 w-8 animate-spin text-muted-foreground' />
			</div>
		)
	}

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
						<p className='text-xs text-muted-foreground mt-0.5'>
							Due today · Overdue · High priority · Completed today
						</p>
					)}
				</div>
				<Button variant='ghost' size='sm' onClick={() => setDayOffset((d) => d + 1)} className='gap-1'>
					{getDayLabel(dayOffset + 1)}
					<ChevronRight className='h-4 w-4' />
				</Button>
			</div>

			{/* Filters */}
			<div className='flex flex-col gap-4 md:flex-row md:items-center'>
				{isMobile && <CreateTaskButton />}
				<Input
					placeholder='Search tasks...'
					value={globalFilter}
					onChange={(e) => setGlobalFilter(e.target.value)}
					className='max-w-sm'
				/>

				<div className='flex flex-wrap gap-2 w-full'>
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
					{hasActiveFilters && (
						<Button
							variant='ghost'
							onClick={resetFilters}
							className='gap-1.5 text-muted-foreground hover:text-foreground'
						>
							{isMobile ? '' : 'Reset'}
							<X className='h-4 w-4' />
						</Button>
					)}
					{!isMobile && (
						<Button className='ml-auto'>
							Create Task <PlusIcon className='h-4 w-4' />
						</Button>
					)}
				</div>
			</div>

			{/* Virtuoso Table */}
			<div className='rounded-lg border border-border/50 bg-card overflow-hidden'>
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
												className={`${isMobile ? 'py-6 px-2' : 'py-3 px-4'} align-middle [&:has([role=checkbox])]:pr-0`}
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
								<tr key={headerGroup.id} className='border-b bg-card shadow-sm'>
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
			<div className='text-sm text-muted-foreground'>{rows.length} tasks</div>

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
								<Button
									className='flex-1 gap-2'
									onClick={() => {
										handleStart(selectedTask.id as UUID)
										setTaskDrawerOpen(false)
									}}
								>
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
