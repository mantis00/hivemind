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
	ArrowRight,
	ArrowUpDown,
	CalendarIcon,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	LoaderCircle,
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
import { GlobalSearchToggle } from './global-search-toggle'
import type { Task, MemberProfile } from '@/lib/react-query/queries'
import { useTasksForEnclosures, useTasksForEnclosuresInRange, useOrgMemberProfiles } from '@/lib/react-query/queries'
import { ReassignMemberButton } from './reassign-member-button'
import { UUID } from 'crypto'
import capitalizeFirstLetter from '@/context/captalize-first-letter'
import { useIsMobile } from '@/hooks/use-mobile'
import { useEffect } from 'react'
import { CreateTaskButton } from './create-task-button'
import { useRouter } from 'next/navigation'
import { getDateStr, getDayLabel } from '@/context/task-day'
import { toLocalDate } from '@/context/to-local-date'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { formatDate } from '@/context/format-date'

/**
 * Returns the display status using the client's local clock.
 * A pending task whose due date has already passed locally is treated as 'late'
 * — no DB trigger needed, and the DB gets lazily synced after load.
 */
function getEffectiveStatus(task: Task): string {
	if (task.status === 'completed' || task.status === 'late') return task.status
	if (task.due_date && task.due_date.slice(0, 10) < getDateStr(0)) return 'late'
	return task.status ?? 'pending'
}

const priorityConfig: Record<string, { color: string }> = {
	low: { color: 'bg-blue-100 text-blue-800' },
	medium: { color: 'bg-yellow-100 text-yellow-800' },
	high: { color: 'bg-red-100 text-red-800' }
}

const statusConfig: Record<string, { label: string; color: string }> = {
	pending: { label: 'Pending', color: 'bg-gray-100 text-gray-800' },
	late: { label: 'Late', color: 'bg-orange-100 text-orange-800' },
	completed: { label: 'Completed', color: 'bg-green-100 text-green-800' }
}

const MOBILE_COL_WIDTHS: Record<string, number> = {
	name: 150,
	status: 100,
	due_date: 100
}

function getColumns(isMobile: boolean, onView: (taskId: UUID) => void, members: MemberProfile[]): ColumnDef<Task>[] {
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
				const label = capitalizeFirstLetter(priority)
				return (
					<div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>{label}</div>
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
			cell: ({ row }) => {
				return (
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
		}
	]
	if (isMobile) {
		const mobileOrder = ['name', 'status', 'due_date']
		return mobileOrder.map((id) => all.find((col) => (col.id ?? (col as { accessorKey?: string }).accessorKey) === id)!)
	}
	return all
}

const MAX_TABLE_HEIGHT_DESKTOP = 680
const MAX_TABLE_HEIGHT_MOBILE = 560
const TARGET_VISIBLE_ROWS_DESKTOP = 8
const TARGET_VISIBLE_ROWS_MOBILE = 7

export function TasksDataTable({ enclosureId, orgId }: { enclosureId: UUID; orgId: UUID }) {
	const isMobile = useIsMobile()
	const router = useRouter()
	const { data: members = [] } = useOrgMemberProfiles(orgId)
	const [dayOffset, setDayOffset] = React.useState(0)
	const [sorting, setSorting] = React.useState<SortingState>([])
	const [globalFilter, setGlobalFilter] = React.useState('')
	const [globalSearch, setGlobalSearch] = React.useState(false)
	const [pendingGlobalSearch, setPendingGlobalSearch] = React.useState(false)
	const [priorityFilter, setPriorityFilter] = React.useState<string[]>([])
	const [statusFilter, setStatusFilter] = React.useState<string[]>([])
	const MAX_TABLE_HEIGHT = isMobile ? MAX_TABLE_HEIGHT_MOBILE : MAX_TABLE_HEIGHT_DESKTOP
	const TARGET_VISIBLE_ROWS = isMobile ? TARGET_VISIBLE_ROWS_MOBILE : TARGET_VISIBLE_ROWS_DESKTOP
	const HEADER_HEIGHT = 49
	const ESTIMATED_ROW_HEIGHT = isMobile ? 73 : 57.8
	const [measuredRowHeight, setMeasuredRowHeight] = React.useState<number | null>(null)
	const [isMounted, setIsMounted] = React.useState(false)
	const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined)
	const isRangeMode = !!(dateRange?.from && dateRange?.to)

	useEffect(() => {
		setIsMounted(true)
	}, [])

	const rowRef = React.useRef<HTMLTableRowElement | null>(null)
	const measuredRef = React.useRef(false)
	// Stable order map: task id → position. Only updated when the set of IDs changes,
	// so status mutations (start/complete) don't reorder rows.
	const stableOrderRef = React.useRef<Map<string, number>>(new Map())

	const hasActiveFilters = priorityFilter.length > 0 || statusFilter.length > 0 || globalFilter !== '' || globalSearch

	const resetFilters = () => {
		setPriorityFilter([])
		setStatusFilter([])
		setGlobalFilter('')
		setGlobalSearch(false)
		setPendingGlobalSearch(false)
	}

	const { data: enclosureTasks, isFetching: tasksFetching } = useTasksForEnclosures(isRangeMode ? [] : [enclosureId])

	const todayCounts = React.useMemo(() => {
		if (isRangeMode) return null
		const source = enclosureTasks ?? []
		const todayDate = getDateStr(0)
		const dueToday = source.filter(
			(t) => t.due_date && t.due_date.slice(0, 10) === todayDate && t.status !== 'completed'
		).length
		const late = source.filter((t) => getEffectiveStatus(t) === 'late').length
		return { dueToday, late }
	}, [enclosureTasks, isRangeMode])
	const { data: rangeTasks, isFetching: rangeFetching } = useTasksForEnclosuresInRange(
		isRangeMode ? [enclosureId] : [],
		dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
		dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
	)
	const activeLoading = pendingGlobalSearch || (isRangeMode ? rangeFetching : tasksFetching)

	const handleView = React.useCallback(
		(taskId: UUID) => {
			router.push(`/protected/orgs/${orgId}/enclosures/${enclosureId}/${taskId}`)
		},
		[router, orgId, enclosureId]
	)

	const columns = React.useMemo(() => getColumns(isMobile, handleView, members), [isMobile, handleView, members])

	const filteredData = React.useMemo(() => {
		const targetDate = getDateStr(dayOffset)
		const todayDate = getDateStr(0)
		const source = isRangeMode ? (rangeTasks ?? []) : (enclosureTasks ?? [])

		const tasks = source.filter((task) => {
			const priorityMatch = priorityFilter.length === 0 || (task.priority && priorityFilter.includes(task.priority))
			const effectiveStatus = getEffectiveStatus(task)
			const statusMatch = statusFilter.length === 0 || statusFilter.includes(effectiveStatus)
			if (!priorityMatch || !statusMatch) return false

			// When global search mode is on, skip date filtering — search across all tasks
			if (globalSearch) return true

			// In range mode, date bounds already applied by Supabase
			if (isRangeMode) return true

			const dueDateStr = task.due_date ? task.due_date.slice(0, 10) : null

			if (dayOffset === 0) {
				// Today: due today + overdue (past due, not completed) + completed today
				const dueToday = dueDateStr === todayDate
				const overdue = dueDateStr !== null && dueDateStr < todayDate && task.status !== 'completed'
				const completedToday =
					task.status === 'completed' && task.completed_time != null && toLocalDate(task.completed_time) === todayDate
				return dueToday || overdue || completedToday
			}

			const completedOnDay =
				task.status === 'completed' && task.completed_time != null && toLocalDate(task.completed_time) === targetDate

			if (targetDate < todayDate) {
				// Past days: only show completed tasks — late/pending tasks already appear on Today
				return (dueDateStr === targetDate && task.status === 'completed') || completedOnDay
			}

			// Future days: show tasks due on that date (any status) or completed on that date
			return dueDateStr === targetDate || completedOnDay
		})

		// Update stable order for any task IDs not yet seen
		tasks.forEach((task) => {
			const id = task.id as string
			if (!stableOrderRef.current.has(id)) {
				stableOrderRef.current.set(id, stableOrderRef.current.size)
			}
		})

		if (!isRangeMode && dayOffset === 0) {
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
	}, [enclosureTasks, rangeTasks, priorityFilter, statusFilter, dayOffset, isRangeMode, globalSearch])

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

	const rowH = measuredRowHeight ?? ESTIMATED_ROW_HEIGHT
	const naturalHeight = rows.length * rowH + HEADER_HEIGHT
	const cappedHeight = Math.min(TARGET_VISIBLE_ROWS * rowH + HEADER_HEIGHT, MAX_TABLE_HEIGHT)
	const tableHeight = rows.length <= TARGET_VISIBLE_ROWS ? naturalHeight : cappedHeight

	// Measure a single row's height and refine the table height
	// eslint-disable-next-line react-hooks/exhaustive-deps
	React.useLayoutEffect(() => {
		if (rowRef.current && !measuredRef.current) {
			const rowHeight = rowRef.current.getBoundingClientRect().height
			if (rowHeight > 0) {
				setMeasuredRowHeight(rowHeight)
				measuredRef.current = true
			}
		}
	})

	// Reset stable order + measurement when the day changes (different task set)
	React.useEffect(() => {
		stableOrderRef.current = new Map()
		measuredRef.current = false
		setMeasuredRowHeight(null)
	}, [dayOffset])

	// Reset stable order + measurement when the date range changes
	React.useEffect(() => {
		stableOrderRef.current = new Map()
		measuredRef.current = false
		setMeasuredRowHeight(null)
	}, [dateRange])

	// Reset measurement when sort order changes so height recomputes
	React.useEffect(() => {
		measuredRef.current = false
	}, [sorting])

	// Clear the global-search pending loader once data is available
	React.useEffect(() => {
		if (pendingGlobalSearch && !tasksFetching) {
			setPendingGlobalSearch(false)
		}
	}, [pendingGlobalSearch, tasksFetching])

	if (!isMounted) return null

	return (
		<div className='w-full space-y-4'>
			{/* Day Navigator / Range Header */}
			{isRangeMode ? (
				<div className='flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2'>
					<div className='flex-1' />
					<div className='text-center'>
						<p className='text-sm font-semibold'>
							{formatDate(dateRange!.from!.toISOString())} – {formatDate(dateRange!.to!.toISOString())}
						</p>
						<p className='text-xs text-muted-foreground'>Custom date range · {rows.length} tasks</p>
					</div>
					<div className='flex flex-1 justify-end'>
						<Button
							variant='ghost'
							size='sm'
							onClick={() => setDateRange(undefined)}
							className='gap-1 text-muted-foreground'
						>
							<X className='h-4 w-4' />
							Clear range
						</Button>
					</div>
				</div>
			) : globalSearch ? (
				<div className='flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2'>
					<div className='flex-1' />
					<div className='text-center'>
						<p className='text-sm font-semibold'>All dates</p>
						<p className='text-xs text-muted-foreground'>Searching across all tasks · {rows.length} results</p>
					</div>
					<div className='flex flex-1 justify-end'>
						<Button
							variant='ghost'
							size='sm'
							onClick={() => setGlobalSearch(false)}
							className='gap-1 text-muted-foreground'
						>
							<X className='h-4 w-4' />
							Clear
						</Button>
					</div>
				</div>
			) : (
				<div className='flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2'>
					<Button variant='ghost' size='sm' onClick={() => setDayOffset((d) => d - 1)} className='gap-1'>
						<ChevronLeft className='h-4 w-4' />
						{getDayLabel(dayOffset - 1)}
					</Button>
					<div className='text-center'>
						<p className='text-sm font-semibold'>{getDayLabel(dayOffset)}</p>
						<p className='text-xs text-muted-foreground'>{getDateStr(dayOffset)}</p>
						{dayOffset === 0 && todayCounts && (
							<p className='text-xs text-muted-foreground mt-0.5'>
								{todayCounts.dueToday} due today · {todayCounts.late} late
							</p>
						)}
					</div>
					<Button variant='ghost' size='sm' onClick={() => setDayOffset((d) => d + 1)} className='gap-1'>
						{getDayLabel(dayOffset + 1)}
						<ChevronRight className='h-4 w-4' />
					</Button>
				</div>
			)}

			{/* Filters */}
			<div className='flex flex-col gap-3 md:flex-row md:items-center md:flex-wrap'>
				{isMobile && <CreateTaskButton enclosureId={enclosureId} orgId={orgId} />}
				<div className='flex items-center gap-2'>
					<Input
						placeholder='Search tasks...'
						value={globalFilter}
						onChange={(e) => setGlobalFilter(e.target.value)}
						className='w-48'
					/>
					<GlobalSearchToggle
						globalSearch={globalSearch}
						onGlobalSearchChange={(val) => {
							if (val) {
								setPendingGlobalSearch(true)
								setDateRange(undefined)
							}
							setGlobalSearch(val)
						}}
					/>
				</div>
				<div className='flex flex-wrap items-center gap-2 flex-1'>
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
									{capitalizeFirstLetter(priority)}
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
							{(['pending', 'late', 'completed'] as const).map((status) => (
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
					<Popover>
						<PopoverTrigger asChild>
							<Button variant={isRangeMode ? 'secondary' : 'outline'} className='gap-2'>
								<CalendarIcon className='h-4 w-4' />
								{isRangeMode
									? `${formatDate(dateRange!.from!.toISOString(), false)} – ${formatDate(dateRange!.to!.toISOString())}`
									: 'Date range'}
							</Button>
						</PopoverTrigger>
						<PopoverContent className='w-auto p-0' align='start'>
							<Calendar
								mode='range'
								selected={dateRange}
								onSelect={(range) => {
									setDateRange(range)
									if (range?.from && range?.to) {
										setGlobalSearch(false)
										setPendingGlobalSearch(false)
									}
								}}
								numberOfMonths={isMobile ? 1 : 2}
							/>
						</PopoverContent>
					</Popover>
					<Button
						variant='ghost'
						onClick={resetFilters}
						className={`gap-1.5 text-muted-foreground hover:text-foreground ${hasActiveFilters ? '' : 'invisible pointer-events-none'}`}
					>
						{isMobile ? '' : 'Reset'}
						<X className='h-4 w-4' />
					</Button>
					{!isMobile && (
						<div className='ml-auto'>
							<CreateTaskButton enclosureId={enclosureId} orgId={orgId} />
						</div>
					)}
				</div>
			</div>

			{/* Virtuoso Table */}
			<div className='rounded-lg border border-border/50 bg-card overflow-hidden'>
				{activeLoading ? (
					<div className='flex flex-col items-center justify-center h-48 w-full gap-2'>
						<LoaderCircle className='h-8 w-8 animate-spin text-muted-foreground' />
					</div>
				) : rows.length === 0 ? (
					<div className='flex items-center justify-center h-24 text-muted-foreground text-sm'>
						{isRangeMode
							? `No tasks between ${formatDate(dateRange!.from!.toISOString(), false)} and ${formatDate(dateRange!.to!.toISOString())}.`
							: `No tasks for ${getDayLabel(dayOffset).toLowerCase()}.`}
					</div>
				) : rows.length <= TARGET_VISIBLE_ROWS ? (
					// Plain table for small row counts — no fixed height, no scrollbar
					<table
						style={{ width: '100%', borderCollapse: 'collapse', ...(isMobile ? { tableLayout: 'fixed' } : {}) }}
						className='w-full caption-bottom text-sm'
					>
						<thead className='[&_tr]:border-b'>
							{table.getHeaderGroups().map((headerGroup) => (
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
							))}
						</thead>
						<tbody className='[&_tr:last-child]:border-0'>
							{rows.map((row, index) => (
								<tr
									key={row.id}
									ref={index === 0 ? rowRef : undefined}
									className='border-b transition-colors hover:bg-muted/50 cursor-pointer active:bg-muted'
									onClick={() => handleView(row.original.id as UUID)}
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
							))}
						</tbody>
					</table>
				) : (
					<TableVirtuoso
						style={{ height: tableHeight, overflowX: 'hidden' }}
						totalCount={rows.length}
						className='scrollbar-no-track'
						components={{
							Table: ({ style, ...props }) => (
								<table
									{...props}
									style={{
										...style,
										width: '100%',
										borderCollapse: 'collapse',
										...(isMobile ? { tableLayout: 'fixed' } : {})
									}}
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
										className='border-b transition-colors hover:bg-muted/50 cursor-pointer active:bg-muted'
										onClick={() => handleView(row.original.id as UUID)}
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
		</div>
	)
}
