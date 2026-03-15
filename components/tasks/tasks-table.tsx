'use client'

import * as React from 'react'
import {
	SortingState,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	useReactTable
} from '@tanstack/react-table'
import { TableVirtuoso } from 'react-virtuoso'
import { LoaderCircle } from 'lucide-react'
import { UUID } from 'crypto'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

import {
	useTasksForEnclosures,
	useTasksForEnclosuresInRange,
	useOrgMemberProfiles,
	useOrgEnclosures,
	useOrgSpecies
} from '@/lib/react-query/queries'
import { useIsMobile } from '@/hooks/use-mobile'
import { getDateStr, getDayLabel } from '@/context/task-day'
import { toLocalDate } from '@/context/to-local-date'
import { formatDate } from '@/context/format-date'
import {
	getEffectiveStatus,
	MOBILE_COL_WIDTHS,
	OPTIONAL_COLUMNS,
	ORG_OPTIONAL_COLUMNS,
	DEFAULT_COLUMN_LABELS
} from '@/context/task-config'
import { getColumns } from './tasks-columns'
import { DayNavigator } from './day-navigator'
import { TasksFilters, type TaskFilters } from './tasks-filters'
import { ColumnsToggle } from './columns-toggle'
import { startNavProgress } from '@/components/navigation/nav-progress-bar'

const MAX_TABLE_HEIGHT_DESKTOP = 680
const MAX_TABLE_HEIGHT_MOBILE = 560
const TARGET_VISIBLE_ROWS_DESKTOP = 8
const TARGET_VISIBLE_ROWS_MOBILE = 7

export function TasksDataTable({
	enclosureId,
	orgId,
	orgEnclosures: isOrgMode = false,
	createTaskButton
}: {
	enclosureId?: UUID
	orgId: UUID
	orgEnclosures?: boolean
	createTaskButton?: React.ReactNode
}) {
	const isMobile = useIsMobile()
	const router = useRouter()
	const { data: members = [] } = useOrgMemberProfiles(orgId)

	// Org-mode data — hooks are always called but only used when isOrgMode
	const { data: fetchedOrgEnclosures = [] } = useOrgEnclosures(orgId)
	const { data: fetchedOrgSpecies } = useOrgSpecies(orgId)

	const enclosureIds = React.useMemo(
		() => (isOrgMode ? fetchedOrgEnclosures.map((e) => e.id) : enclosureId ? [enclosureId] : []),
		[isOrgMode, fetchedOrgEnclosures, enclosureId]
	)

	const [dayOffset, setDayOffset] = React.useState(0)
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'due_date', desc: false }])
	const [filters, setFilters] = React.useState<TaskFilters>({
		globalFilter: '',
		globalSearch: false,
		priorityFilter: [],
		statusFilter: [],
		dateRange: undefined,
		speciesFilter: ''
	})
	const [pendingGlobalSearch, setPendingGlobalSearch] = React.useState(false)
	const [measuredRowHeight, setMeasuredRowHeight] = React.useState<number | null>(null)
	const [isMounted, setIsMounted] = React.useState(false)
	const [extraColumns, setExtraColumns] = React.useState<string[]>([])

	const { globalFilter, globalSearch, priorityFilter, statusFilter, dateRange, speciesFilter } = filters
	const isRangeMode = !!(dateRange?.from && dateRange?.to)

	const hasExtraColumns = extraColumns.length > 0

	const defaultColumnIds = React.useMemo(() => {
		if (isOrgMode) {
			return isMobile
				? ['enclosure_name', 'name', 'due_date']
				: ['enclosure_name', 'species', 'name', 'status', 'due_date', 'assigned_to']
		}
		return isMobile
			? ['name', 'status', 'due_date']
			: ['name', 'description', 'due_date', 'priority', 'status', 'assigned_to']
	}, [isOrgMode, isMobile])

	const desktopDefaultColumnIds = React.useMemo(() => {
		if (isOrgMode) return ['enclosure_name', 'species', 'name', 'status', 'due_date', 'assigned_to']
		return ['name', 'description', 'due_date', 'priority', 'status', 'assigned_to']
	}, [isOrgMode])

	const toggleableColumns = React.useMemo(() => {
		const platformExtras = desktopDefaultColumnIds
			.filter((id) => !defaultColumnIds.includes(id))
			.map((id) => ({ id, label: DEFAULT_COLUMN_LABELS[id] ?? id }))
		const modeOptionals = isOrgMode ? ORG_OPTIONAL_COLUMNS : []
		return [...platformExtras, ...modeOptionals, ...OPTIONAL_COLUMNS]
	}, [desktopDefaultColumnIds, defaultColumnIds, isOrgMode])

	const getColWidthStyle = React.useCallback(
		(colId: string): React.CSSProperties | undefined => {
			if (!isMobile) return undefined
			const w = MOBILE_COL_WIDTHS[colId]
			return w ? { width: w, minWidth: w } : undefined
		},
		[isMobile]
	)

	const MAX_TABLE_HEIGHT = isMobile ? MAX_TABLE_HEIGHT_MOBILE : MAX_TABLE_HEIGHT_DESKTOP
	const TARGET_VISIBLE_ROWS = isMobile ? TARGET_VISIBLE_ROWS_MOBILE : TARGET_VISIBLE_ROWS_DESKTOP
	const HEADER_HEIGHT = 49
	const ESTIMATED_ROW_HEIGHT = isMobile ? 73 : 57.8

	useEffect(() => {
		setIsMounted(true)
	}, [])

	const rowRef = React.useRef<HTMLTableRowElement | null>(null)
	const measuredRef = React.useRef(false)
	const stableOrderRef = React.useRef<Map<string, number>>(new Map())

	const hasActiveFilters =
		priorityFilter.length > 0 ||
		statusFilter.length > 0 ||
		globalFilter !== '' ||
		globalSearch ||
		isRangeMode ||
		(isOrgMode && speciesFilter !== '') ||
		extraColumns.length > 0

	const resetFilters = () => {
		setFilters({
			globalFilter: '',
			globalSearch: false,
			priorityFilter: [],
			statusFilter: [],
			dateRange: undefined,
			speciesFilter: ''
		})
		setPendingGlobalSearch(false)
		setExtraColumns([])
	}

	const { data: enclosureTasks, isFetching: tasksFetching } = useTasksForEnclosures(isRangeMode ? [] : enclosureIds)
	const { data: rangeTasks, isFetching: rangeFetching } = useTasksForEnclosuresInRange(
		isRangeMode ? enclosureIds : [],
		dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
		dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
	)

	const todayCounts = React.useMemo(() => {
		if (isRangeMode) return null
		const source = enclosureTasks ?? []
		const todayDate = getDateStr(0)
		const dueToday = source.filter(
			(t) => t.due_date && toLocalDate(t.due_date) === todayDate && t.status !== 'completed'
		).length
		const late = source.filter((t) => getEffectiveStatus(t) === 'late').length
		return { dueToday, late }
	}, [enclosureTasks, isRangeMode])

	const activeLoading = pendingGlobalSearch || (isRangeMode ? rangeFetching : tasksFetching)

	const handleView = React.useCallback(
		(taskId: UUID) => {
			if (isOrgMode) {
				const task = (enclosureTasks ?? rangeTasks ?? []).find((t) => t.id === taskId)
				if (!task) return
				startNavProgress()
				router.push(`/protected/orgs/${orgId}/enclosures/${task.enclosure_id}/${taskId}`)
			} else {
				startNavProgress()
				router.push(`/protected/orgs/${orgId}/enclosures/${enclosureId}/${taskId}`)
			}
		},
		[router, orgId, enclosureId, isOrgMode, enclosureTasks, rangeTasks]
	)

	const handleViewEnclosure = React.useCallback(
		(enclosureId: UUID) => {
			startNavProgress()
			router.push(`/protected/orgs/${orgId}/enclosures/${enclosureId}`)
		},
		[router, orgId]
	)

	const columns = React.useMemo(
		() =>
			getColumns(
				isMobile,
				handleView,
				members,
				isOrgMode
					? isMobile
						? ['enclosure_name', 'name', 'due_date']
						: ['enclosure_name', 'species', 'name', 'status', 'due_date', 'assigned_to', 'actions']
					: undefined,
				isOrgMode ? fetchedOrgEnclosures : undefined,
				isOrgMode ? (fetchedOrgSpecies ?? undefined) : undefined,
				isOrgMode ? handleViewEnclosure : undefined,
				extraColumns
			),
		[
			isMobile,
			handleView,
			members,
			isOrgMode,
			fetchedOrgEnclosures,
			fetchedOrgSpecies,
			handleViewEnclosure,
			extraColumns
		]
	)

	const filteredData = React.useMemo(() => {
		const targetDate = getDateStr(dayOffset)
		const todayDate = getDateStr(0)
		const source = isRangeMode ? (rangeTasks ?? []) : (enclosureTasks ?? [])

		const speciesEnclosureIds =
			isOrgMode && speciesFilter
				? new Set(
						fetchedOrgEnclosures
							.filter(
								(e) =>
									e.species_id === (fetchedOrgSpecies ?? []).find((s) => s.custom_common_name === speciesFilter)?.id
							)
							.map((e) => e.id as string)
					)
				: null

		const tasks = source.filter((task) => {
			if (speciesEnclosureIds && !speciesEnclosureIds.has(task.enclosure_id as string)) return false
			const priorityMatch = priorityFilter.length === 0 || (task.priority && priorityFilter.includes(task.priority))
			const effectiveStatus = getEffectiveStatus(task)
			const statusMatch = statusFilter.length === 0 || statusFilter.includes(effectiveStatus)
			if (!priorityMatch || !statusMatch) return false

			if (globalSearch) return true
			if (isRangeMode) return true

			const dueDateStr = task.due_date ? toLocalDate(task.due_date) : null

			if (dayOffset === 0) {
				const dueToday = dueDateStr === todayDate
				const overdue = dueDateStr !== null && dueDateStr < todayDate && task.status !== 'completed'
				const completedToday =
					task.status === 'completed' && task.completed_time != null && toLocalDate(task.completed_time) === todayDate
				return dueToday || overdue || completedToday
			}

			const completedOnDay =
				task.status === 'completed' && task.completed_time != null && toLocalDate(task.completed_time) === targetDate

			if (targetDate < todayDate) {
				return (dueDateStr === targetDate && task.status === 'completed') || completedOnDay
			}

			return dueDateStr === targetDate || completedOnDay
		})

		tasks.forEach((task) => {
			const id = task.id as string
			if (!stableOrderRef.current.has(id)) {
				stableOrderRef.current.set(id, stableOrderRef.current.size)
			}
		})

		if (!isRangeMode && dayOffset === 0) {
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
	}, [
		enclosureTasks,
		rangeTasks,
		priorityFilter,
		statusFilter,
		dayOffset,
		isRangeMode,
		globalSearch,
		isOrgMode,
		speciesFilter,
		fetchedOrgEnclosures,
		fetchedOrgSpecies
	])

	const table = useReactTable({
		data: filteredData,
		columns,
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		globalFilterFn: 'includesString',
		state: { sorting, globalFilter },
		onGlobalFilterChange: (value) => setFilters((prev) => ({ ...prev, globalFilter: value as string }))
	})

	const { rows } = table.getRowModel()
	const rowH = measuredRowHeight ?? ESTIMATED_ROW_HEIGHT
	const naturalHeight = rows.length * rowH + HEADER_HEIGHT
	const cappedHeight = Math.min(TARGET_VISIBLE_ROWS * rowH + HEADER_HEIGHT, MAX_TABLE_HEIGHT)
	const tableHeight = rows.length <= TARGET_VISIBLE_ROWS ? naturalHeight : cappedHeight

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

	React.useEffect(() => {
		stableOrderRef.current = new Map()
		measuredRef.current = false
		setMeasuredRowHeight(null)
	}, [dayOffset])

	React.useEffect(() => {
		stableOrderRef.current = new Map()
		measuredRef.current = false
		setMeasuredRowHeight(null)
	}, [dateRange])

	React.useEffect(() => {
		measuredRef.current = false
	}, [sorting])

	React.useEffect(() => {
		if (pendingGlobalSearch && !tasksFetching) setPendingGlobalSearch(false)
	}, [pendingGlobalSearch, tasksFetching])

	React.useEffect(() => {
		measuredRef.current = false
		setMeasuredRowHeight(null)
	}, [extraColumns])

	// When the platform changes (mobile ↔ desktop), drop any extra columns that
	// are now part of the new platform's defaults so the badge resets cleanly.
	React.useEffect(() => {
		setExtraColumns((prev) => prev.filter((id) => !defaultColumnIds.includes(id)))
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isMobile])

	if (!isMounted) return null

	return (
		<div className='w-full space-y-4'>
			<DayNavigator
				dayOffset={dayOffset}
				onDayChange={setDayOffset}
				isRangeMode={isRangeMode}
				globalSearch={globalSearch}
				dateRange={dateRange}
				rowCount={rows.length}
				todayCounts={todayCounts}
			/>

			<TasksFilters
				enclosureId={isOrgMode ? undefined : enclosureId}
				orgId={orgId}
				filters={filters}
				onFiltersChange={(newFilters) => {
					if (newFilters.globalSearch && !globalSearch) setPendingGlobalSearch(true)
					setFilters(newFilters)
				}}
				hasActiveFilters={hasActiveFilters}
				onReset={resetFilters}
				showSpeciesFilter={isOrgMode}
				columnsToggle={
					<ColumnsToggle
						defaultColumnIds={defaultColumnIds}
						extraColumnIds={extraColumns}
						onExtraColumnsChange={setExtraColumns}
						toggleableColumns={toggleableColumns}
					/>
				}
			/>

			{isOrgMode && createTaskButton && <div>{createTaskButton}</div>}

			{/* Table */}
			<div
				className={`rounded-lg border border-border/50 bg-card ${hasExtraColumns ? 'overflow-x-auto' : 'overflow-hidden'}`}
			>
				{activeLoading ? (
					<div className='flex flex-col items-center justify-center h-48 w-full gap-2'>
						<LoaderCircle className='h-8 w-8 animate-spin text-muted-foreground' />
					</div>
				) : rows.length === 0 ? (
					<div className='flex items-center justify-center h-24 text-muted-foreground text-sm'>
						{isRangeMode
							? `No tasks between ${formatDate(dateRange!.from!.toISOString(), false)} and ${formatDate(dateRange!.to!.toISOString())}.`
							: globalSearch
								? 'No tasks match your search across all dates.'
								: `No tasks for ${getDayLabel(dayOffset).toLowerCase()}.`}
					</div>
				) : rows.length <= TARGET_VISIBLE_ROWS ? (
					<table
						style={{
							borderCollapse: 'collapse',
							...(hasExtraColumns
								? { width: 'auto', minWidth: '100%' }
								: { width: '100%', ...(isMobile ? { tableLayout: 'fixed' } : {}) })
						}}
						className={`caption-bottom text-sm${hasExtraColumns ? '' : ' w-full'}`}
					>
						<thead className='[&_tr]:border-b'>
							{table.getHeaderGroups().map((headerGroup) => (
								<tr key={headerGroup.id} className='border-b bg-muted shadow-sm'>
									{headerGroup.headers.map((header) => (
										<th
											key={header.id}
											style={getColWidthStyle(header.id)}
											className={`h-12 ${isMobile ? 'px-2' : 'px-4'} text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0${hasExtraColumns && !isMobile ? ' overflow-hidden whitespace-nowrap' : ''}`}
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
									className={`group border-b transition-colors hover:bg-orange-300/20 dark:hover:bg-orange-400/30 cursor-pointer active:bg-orange-100 dark:active:bg-orange-950/30 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/70'}`}
									onClick={() => handleView(row.original.id as UUID)}
								>
									{row.getVisibleCells().map((cell) => (
										<td
											key={cell.id}
											style={getColWidthStyle(cell.column.id)}
											className={`${isMobile ? 'py-6 px-2' : 'py-3 px-4'} align-middle [&:has([role=checkbox])]:pr-0${hasExtraColumns && !isMobile ? ' overflow-hidden whitespace-nowrap' : ''}`}
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
						style={{ height: tableHeight, overflowX: hasExtraColumns ? 'auto' : 'hidden' }}
						totalCount={rows.length}
						className='scrollbar-no-track'
						components={{
							Table: ({ style, ...props }) => (
								<table
									{...props}
									style={{
										...style,
										borderCollapse: 'collapse',
										...(hasExtraColumns
											? { width: 'max-content' }
											: { width: '100%', ...(isMobile ? { tableLayout: 'fixed' } : {}) })
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
								const isEven = index % 2 === 0
								return (
									<tr
										{...props}
										ref={index === 0 ? rowRef : undefined}
										style={style}
										className={`group border-b transition-colors hover:bg-orange-300/20 dark:hover:bg-orange-400/30 cursor-pointer active:bg-orange-100 dark:active:bg-orange-950/30 ${isEven ? 'bg-background' : 'bg-muted/70'}`}
										onClick={() => handleView(row.original.id as UUID)}
									>
										{row.getVisibleCells().map((cell) => (
											<td
												key={cell.id}
												style={getColWidthStyle(cell.column.id)}
												className={`${isMobile ? 'py-6 px-2' : 'py-3 px-4'} align-middle [&:has([role=checkbox])]:pr-0${hasExtraColumns && !isMobile ? ' overflow-hidden whitespace-nowrap' : ''}`}
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
								<tr key={headerGroup.id} className='border-b bg-muted shadow-sm'>
									{headerGroup.headers.map((header) => (
										<th
											key={header.id}
											style={getColWidthStyle(header.id)}
											className={`h-12 ${isMobile ? 'px-2' : 'px-4'} text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0${hasExtraColumns && !isMobile ? ' overflow-hidden whitespace-nowrap' : ''}`}
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

			<div className='text-sm text-muted-foreground'>{rows.length} tasks</div>
		</div>
	)
}
