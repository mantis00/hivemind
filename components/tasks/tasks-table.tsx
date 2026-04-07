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
import { CheckSquare, ListChecks, LoaderCircle, X } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
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
	const { data: allOrgEnclosures = [] } = useOrgEnclosures(orgId, 'all')
	const { data: fetchedOrgSpecies } = useOrgSpecies(orgId)

	const enclosureIds = React.useMemo(
		() => (isOrgMode ? fetchedOrgEnclosures.map((e) => e.id) : enclosureId ? [enclosureId] : []),
		[isOrgMode, fetchedOrgEnclosures, enclosureId]
	)

	const [dayOffset, setDayOffset] = React.useState(0)
	const [sorting, setSorting] = React.useState<SortingState>([
		{ id: 'status', desc: false },
		{ id: 'due_date', desc: false }
	])
	const [filters, setFilters] = React.useState<TaskFilters>({
		globalFilter: '',
		globalSearch: false,
		priorityFilter: [],
		statusFilter: [],
		dateRange: undefined
	})
	const [pendingGlobalSearch, setPendingGlobalSearch] = React.useState(false)
	const [measuredRowHeight, setMeasuredRowHeight] = React.useState<number | null>(null)
	const [isMounted, setIsMounted] = React.useState(false)
	const [extraColumns, setExtraColumns] = React.useState<string[]>([])
	const [selectMode, setSelectMode] = React.useState(false)
	const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
	// lockedKey = "templateId::speciesId" of the first selected task; null when nothing selected
	const [lockedKey, setLockedKey] = React.useState<string | null>(null)

	const { globalFilter, globalSearch, priorityFilter, statusFilter, dateRange } = filters
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
		extraColumns.length > 0

	const resetFilters = () => {
		setFilters({
			globalFilter: '',
			globalSearch: false,
			priorityFilter: [],
			statusFilter: [],
			dateRange: undefined
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

	const handleBatchComplete = React.useCallback(() => {
		if (selectedIds.size === 0) return
		// In org-mode, derive enclosureId from the first selected task
		const firstTaskId = [...selectedIds][0]
		const firstTask = (enclosureTasks ?? rangeTasks ?? []).find((t) => (t.id as string) === firstTaskId)
		const targetEnclosureId = isOrgMode ? (firstTask?.enclosure_id as UUID) : enclosureId
		const taskParam = [...selectedIds].join(',')
		startNavProgress()
		router.push(`/protected/orgs/${orgId}/enclosures/${targetEnclosureId}/batch-complete?tasks=${taskParam}`)
	}, [selectedIds, enclosureTasks, rangeTasks, isOrgMode, enclosureId, orgId, router])

	const getTaskLockKey = React.useCallback((task: { template_id: string | null; enclosure_id: string }) => {
		const templateId = task.template_id ?? '__adhoc__'
		return `${templateId}::${task.enclosure_id}`
	}, [])

	const handleToggleSelect = React.useCallback(
		(taskId: string, task: { template_id: string | null; enclosure_id: string }) => {
			setSelectedIds((prev) => {
				const next = new Set(prev)
				if (next.has(taskId)) {
					next.delete(taskId)
					if (next.size === 0) setLockedKey(null)
				} else {
					next.add(taskId)
					if (prev.size === 0) setLockedKey(getTaskLockKey(task))
				}
				return next
			})
		},
		[getTaskLockKey]
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
				allOrgEnclosures,
				isOrgMode ? (fetchedOrgSpecies ?? undefined) : undefined,
				isOrgMode ? handleViewEnclosure : undefined,
				extraColumns,
				selectMode,
				selectedIds,
				handleToggleSelect,
				lockedKey,
				getTaskLockKey
			),
		[
			isMobile,
			handleView,
			members,
			isOrgMode,
			allOrgEnclosures,
			fetchedOrgSpecies,
			handleViewEnclosure,
			extraColumns,
			selectMode,
			selectedIds,
			handleToggleSelect,
			lockedKey,
			getTaskLockKey
		]
	)

	const exitSelectMode = React.useCallback(() => {
		setSelectMode(false)
		setSelectedIds(new Set())
		setLockedKey(null)
	}, [])

	const enclosureNameById = React.useMemo(
		() => new Map(allOrgEnclosures.map((enclosure) => [enclosure.id as string, enclosure.name ?? ''])),
		[allOrgEnclosures]
	)

	const speciesNameByEnclosureId = React.useMemo(
		() =>
			new Map(
				allOrgEnclosures.map((enclosure) => {
					const speciesName =
						(fetchedOrgSpecies ?? []).find((species) => species.id === enclosure.species_id)?.custom_common_name ?? ''
					return [enclosure.id as string, speciesName]
				})
			),
		[allOrgEnclosures, fetchedOrgSpecies]
	)

	const memberNameById = React.useMemo(
		() =>
			new Map(
				members.map((member) => [
					member.id as string,
					member.full_name || `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim()
				])
			),
		[members]
	)

	const filteredData = React.useMemo(() => {
		const targetDate = getDateStr(dayOffset)
		const todayDate = getDateStr(0)
		const source = isRangeMode ? (rangeTasks ?? []) : (enclosureTasks ?? [])
		const normalizedFilter = globalFilter.trim().toLowerCase()

		const tasks = source.filter((task) => {
			const priorityMatch = priorityFilter.length === 0 || (task.priority && priorityFilter.includes(task.priority))
			const effectiveStatus = getEffectiveStatus(task)
			const statusMatch = statusFilter.length === 0 || statusFilter.includes(effectiveStatus)
			if (!priorityMatch || !statusMatch) return false

			if (normalizedFilter) {
				const taskName = task.name?.toLowerCase() ?? ''
				const speciesName = isOrgMode
					? (speciesNameByEnclosureId.get(task.enclosure_id as string)?.toLowerCase() ?? '')
					: ''
				const enclosureName = isOrgMode ? (enclosureNameById.get(task.enclosure_id as string)?.toLowerCase() ?? '') : ''
				const assigneeName = task.assigned_to
					? (memberNameById.get(task.assigned_to as string)?.toLowerCase() ?? '')
					: ''
				if (
					!taskName.includes(normalizedFilter) &&
					!speciesName.includes(normalizedFilter) &&
					!enclosureName.includes(normalizedFilter) &&
					!assigneeName.includes(normalizedFilter)
				)
					return false
			}

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
			const statusOrder: Record<string, number> = { late: 0, pending: 1, completed: 2 }
			return [...tasks].sort((a, b) => {
				const aOrder = statusOrder[getEffectiveStatus(a)] ?? 1
				const bOrder = statusOrder[getEffectiveStatus(b)] ?? 1
				if (aOrder !== bOrder) return aOrder - bOrder
				// Stable secondary: due_date ascending, then insertion order
				const aDate = a.due_date ?? ''
				const bDate = b.due_date ?? ''
				if (aDate !== bDate) return aDate < bDate ? -1 : 1
				const aPos = stableOrderRef.current.get(a.id as string) ?? 999
				const bPos = stableOrderRef.current.get(b.id as string) ?? 999
				return aPos - bPos
			})
		}

		return tasks
	}, [
		enclosureTasks,
		rangeTasks,
		globalFilter,
		priorityFilter,
		statusFilter,
		dayOffset,
		isRangeMode,
		globalSearch,
		isOrgMode,
		enclosureNameById,
		speciesNameByEnclosureId,
		memberNameById
	])

	// Guard against sorting by a column that isn't in the current column set
	// (e.g. 'status' is absent on mobile org-mode which only shows enclosure_name / name / due_date)
	const validSorting = React.useMemo(() => {
		const ids = new Set(columns.map((c) => c.id ?? (c as { accessorKey?: string }).accessorKey ?? ''))
		return sorting.filter((s) => ids.has(s.id))
	}, [sorting, columns])

	const table = useReactTable({
		data: filteredData,
		columns,
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		state: { sorting: validSorting }
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
				includeSpeciesSearch={isOrgMode}
				includeEnclosureAndAssigneeSearch={isOrgMode}
				columnsToggle={
					<ColumnsToggle
						defaultColumnIds={defaultColumnIds}
						extraColumnIds={extraColumns}
						onExtraColumnsChange={setExtraColumns}
						toggleableColumns={toggleableColumns}
					/>
				}
				selectButton={
					selectMode ? (
						<>
							<Button
								variant='outline'
								{...(isMobile ? { size: 'sm' as const, className: 'h-8 gap-1.5' } : { className: 'gap-2' })}
								onClick={exitSelectMode}
							>
								{isMobile ? <X className='h-3.5 w-3.5' /> : <X className='h-4 w-4' />}
								{isMobile ? 'Cancel' : 'Cancel Selection'}
							</Button>
							{selectedIds.size > 0 && (
								<Button
									{...(isMobile ? { size: 'sm' as const, className: 'h-8 gap-1.5' } : { className: 'gap-2' })}
									onClick={handleBatchComplete}
								>
									{isMobile ? <CheckSquare className='h-3.5 w-3.5' /> : <CheckSquare className='h-4 w-4' />}
									{isMobile ? `Complete (${selectedIds.size})` : `Batch Complete (${selectedIds.size})`}
								</Button>
							)}
						</>
					) : (
						<Button
							variant='outline'
							{...(isMobile ? { size: 'sm' as const, className: 'h-8 gap-1.5' } : { className: 'gap-2' })}
							onClick={() => setSelectMode(true)}
						>
							{isMobile ? <ListChecks className='h-3.5 w-3.5' /> : <ListChecks className='h-4 w-4' />}
							{isMobile ? 'Select' : 'Select Tasks'}
						</Button>
					)
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
							{rows.map((row, index) => {
								const task = row.original
								const isGrayed =
									selectMode &&
									lockedKey !== null &&
									getTaskLockKey(task as { template_id: string | null; enclosure_id: string }) !== lockedKey
								const isSelected = selectMode && selectedIds.has(task.id as string)
								const isCompleted = task.status === 'completed'
								const isDisabled = isGrayed || (selectMode && isCompleted)
								return (
									<tr
										key={row.id}
										ref={index === 0 ? rowRef : undefined}
										className={`group border-b transition-colors ${
											isDisabled
												? 'opacity-40 pointer-events-none'
												: isSelected
													? 'bg-orange-200/60 dark:bg-orange-500/20 cursor-pointer'
													: 'hover:bg-orange-300/20 dark:hover:bg-orange-400/30 cursor-pointer active:bg-orange-100 dark:active:bg-orange-950/30'
										} ${!isSelected && !isDisabled ? (index % 2 === 0 ? 'bg-background' : 'bg-muted/70') : ''}`}
										onClick={() => {
											if (selectMode) {
												if (!isGrayed && !isCompleted)
													handleToggleSelect(
														task.id as string,
														task as { template_id: string | null; enclosure_id: string }
													)
												return
											}
											handleView(task.id as UUID)
										}}
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
							})}
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
								const task = row.original
								const isEven = index % 2 === 0
								const isGrayed =
									selectMode &&
									lockedKey !== null &&
									getTaskLockKey(task as { template_id: string | null; enclosure_id: string }) !== lockedKey
								const isSelected = selectMode && selectedIds.has(task.id as string)
								const isCompleted = task.status === 'completed'
								const isDisabled = isGrayed || (selectMode && isCompleted)
								return (
									<tr
										{...props}
										ref={index === 0 ? rowRef : undefined}
										style={style}
										className={`group border-b transition-colors ${
											isDisabled
												? 'opacity-40 pointer-events-none'
												: isSelected
													? 'bg-orange-200/60 dark:bg-orange-500/20 cursor-pointer'
													: 'hover:bg-orange-300/20 dark:hover:bg-orange-400/30 cursor-pointer active:bg-orange-100 dark:active:bg-orange-950/30'
										} ${!isSelected && !isDisabled ? (isEven ? 'bg-background' : 'bg-muted/70') : ''}`}
										onClick={() => {
											if (selectMode) {
												if (!isDisabled)
													handleToggleSelect(
														task.id as string,
														task as { template_id: string | null; enclosure_id: string }
													)
												return
											}
											handleView(task.id as UUID)
										}}
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
