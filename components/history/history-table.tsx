'use client'

import {
	type TimelineFilters,
	TimelineRecordType,
	EnclosureTimelineRow,
	useOrgTaskHistory
} from '@/lib/react-query/queries'
import { UUID } from 'crypto'
import * as React from 'react'
import {
	SortingState,
	ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	useReactTable
} from '@tanstack/react-table'
import { TableVirtuoso } from 'react-virtuoso'
import { LoaderCircle, ArrowUpDown, ChevronDown, Download, Search, X, CalendarIcon, Flag } from 'lucide-react'
import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const MAX_TABLE_HEIGHT_DESKTOP = 680
const MAX_TABLE_HEIGHT_MOBILE = 560
const TARGET_VISIBLE_ROWS_DESKTOP = 10
const TARGET_VISIBLE_ROWS_MOBILE = 8
const HEADER_HEIGHT = 49
const ESTIMATED_ROW_HEIGHT_DESKTOP = 57.8
const ESTIMATED_ROW_HEIGHT_MOBILE = 73

const DEFAULT_FILTERS: TimelineFilters = {
	searchQuery: '',
	recordTypes: [],
	species: [],
	enclosures: [],
	users: [],
	taskTypes: [],
	dateFrom: null,
	dateTo: null
}

const RECORD_TYPE_OPTIONS: { value: TimelineRecordType; label: string }[] = [
	{ value: 'task', label: 'Task' },
	{ value: 'note', label: 'Note' },
	{ value: 'count_change', label: 'Count Change' }
]

const RECORD_TYPE_STYLES: Record<TimelineRecordType, string> = {
	task: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
	note: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
	count_change: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
}

const RECORD_TYPE_LABELS: Record<TimelineRecordType, string> = {
	task: 'Task',
	note: 'Note',
	count_change: 'Count'
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatDate(dateStr: string, includeTime = false): string {
	const date = new Date(dateStr)
	if (includeTime) {
		return format(date, 'MMM d, yyyy h:mm a')
	}
	return format(date, 'MMM d, yyyy')
}

function exportToCsv(data: EnclosureTimelineRow[]) {
	const headers = ['Date', 'Type', 'Enclosure', 'Species', 'Summary', 'Details', 'User']
	const rows = data.map((row) => [
		row.event_date,
		row.record_type,
		row.enclosure_name ?? '',
		row.species_name ?? '',
		row.summary ?? '',
		row.details ?? '',
		row.user_name ?? ''
	])
	const csvContent = [headers, ...rows]
		.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
		.join('\n')
	const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = `enclosure-history-${format(new Date(), 'yyyy-MM-dd')}.csv`
	link.click()
	URL.revokeObjectURL(url)
}

// ============================================================================
// Column Definitions
// ============================================================================

function getTimelineColumns(isMobile: boolean): ColumnDef<EnclosureTimelineRow>[] {
	const baseColumns: ColumnDef<EnclosureTimelineRow>[] = [
		{
			accessorKey: 'event_date',
			header: ({ column }) => (
				<Button
					variant='ghost'
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
					className='-ml-4 h-8 data-[state=open]:bg-accent'
				>
					Date
					<ArrowUpDown className='ml-2 h-4 w-4' />
				</Button>
			),
			cell: ({ row }) => {
				const date = row.getValue('event_date') as string
				if (!date) return <span className='text-sm'>—</span>
				const dateObj = new Date(date)
				return (
					<div className='flex flex-col'>
						<span className='text-sm whitespace-nowrap'>{format(dateObj, 'MMM d, yyyy')}</span>
						<span className='text-xs text-muted-foreground whitespace-nowrap'>{format(dateObj, 'h:mm a')}</span>
					</div>
				)
			}
		},
		{
			accessorKey: 'record_type',
			header: 'Type',
			cell: ({ row }) => {
				const type = row.getValue('record_type') as TimelineRecordType
				const details = row.original.details
				const isFlagged = type === 'note' && details === 'FLAGGED'

				if (isFlagged) {
					return (
						<Badge className='bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 font-medium gap-1'>
							<Flag className='h-3 w-3' />
							Note
						</Badge>
					)
				}

				return <Badge className={cn('font-medium', RECORD_TYPE_STYLES[type])}>{RECORD_TYPE_LABELS[type]}</Badge>
			}
		},
		{
			accessorKey: 'enclosure_name',
			header: 'Enclosure',
			cell: ({ row }) => (
				<span className='text-sm truncate max-w-[180px] block'>{row.getValue('enclosure_name') ?? '—'}</span>
			)
		}
	]

	if (!isMobile) {
		baseColumns.push({
			accessorKey: 'species_name',
			header: 'Species',
			cell: ({ row }) => (
				<span className='text-sm truncate max-w-[150px] block italic'>{row.getValue('species_name') ?? '—'}</span>
			)
		})
	}

	baseColumns.push({
		accessorKey: 'summary',
		header: 'Summary',
		cell: ({ row }) => {
			const summary = row.getValue('summary') as string | null
			return <span className='text-sm line-clamp-2'>{summary ?? '—'}</span>
		}
	})

	if (!isMobile) {
		baseColumns.push({
			accessorKey: 'details',
			header: 'Details',
			cell: ({ row }) => {
				const details = row.original.details
				const type = row.original.record_type

				if (!details || details === 'FLAGGED' || type !== 'task') {
					return <span className='text-muted-foreground'>—</span>
				}

				const truncated = details.length > 50

				if (truncated) {
					return (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<span className='text-sm text-muted-foreground truncate max-w-[200px] block cursor-help'>
										{details.slice(0, 50)}...
									</span>
								</TooltipTrigger>
								<TooltipContent className='max-w-xs'>
									<p className='text-sm whitespace-pre-wrap'>{details.replace(/\|/g, '\n')}</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)
				}

				return <span className='text-sm text-muted-foreground'>{details}</span>
			}
		})
	}

	baseColumns.push({
		accessorKey: 'user_name',
		header: 'User',
		cell: ({ row }) => <span className='text-sm truncate max-w-[120px] block'>{row.getValue('user_name') ?? '—'}</span>
	})

	return baseColumns
}

// ============================================================================
// Filter Bar Component
// ============================================================================

type FiltersBarProps = {
	filters: TimelineFilters
	onFiltersChange: (filters: TimelineFilters) => void
	hasActiveFilters: boolean
	onReset: () => void
	onExport: () => void
	data: EnclosureTimelineRow[]
}

function FiltersBar({ filters, onFiltersChange, hasActiveFilters, onReset, onExport, data }: FiltersBarProps) {
	const isMobile = useIsMobile()
	const [searchValue, setSearchValue] = React.useState(filters.searchQuery)

	const dateRange: DateRange | undefined = React.useMemo(() => {
		if (filters.dateFrom && filters.dateTo) {
			return { from: new Date(filters.dateFrom), to: new Date(filters.dateTo) }
		}
		return undefined
	}, [filters.dateFrom, filters.dateTo])

	// Extract distinct options from data
	const speciesOptions = React.useMemo(() => {
		const uniqueSpecies = [...new Set(data.map((row) => row.species_name).filter(Boolean))] as string[]
		return uniqueSpecies.sort()
	}, [data])

	const enclosureOptions = React.useMemo(() => {
		// If species filters are active, only show enclosures belonging to those species
		const filteredData =
			filters.species.length > 0
				? data.filter((row) => row.species_name && filters.species.includes(row.species_name))
				: data
		const uniqueEnclosures = [...new Set(filteredData.map((row) => row.enclosure_name).filter(Boolean))] as string[]
		return uniqueEnclosures.sort()
	}, [data, filters.species])

	const userOptions = React.useMemo(() => {
		const uniqueUsers = [...new Set(data.map((row) => row.user_name).filter(Boolean))] as string[]
		return uniqueUsers.sort()
	}, [data])

	const taskTypeOptions = React.useMemo(() => {
		const uniqueTaskTypes = [...new Set(data.map((row) => row.template_type).filter(Boolean))] as string[]
		return uniqueTaskTypes.sort()
	}, [data])

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value
		setSearchValue(value)
		onFiltersChange({ ...filters, searchQuery: value })
	}

	const handleRecordTypeToggle = (type: TimelineRecordType, checked: boolean) => {
		const newTypes = checked ? [...filters.recordTypes, type] : filters.recordTypes.filter((t) => t !== type)
		onFiltersChange({ ...filters, recordTypes: newTypes })
	}

	const handleMultiSelectToggle = (
		filterKey: 'species' | 'enclosures' | 'users' | 'taskTypes',
		value: string,
		checked: boolean
	) => {
		const currentValues = filters[filterKey]
		const newValues = checked ? [...currentValues, value] : currentValues.filter((v) => v !== value)

		// If changing species filter, also clear enclosures that are no longer valid
		if (filterKey === 'species') {
			const validEnclosures =
				newValues.length > 0
					? (data
							.filter((row) => row.species_name && newValues.includes(row.species_name))
							.map((row) => row.enclosure_name)
							.filter(Boolean) as string[])
					: (data.map((row) => row.enclosure_name).filter(Boolean) as string[])

			const filteredEnclosures = filters.enclosures.filter((e) => validEnclosures.includes(e))
			onFiltersChange({ ...filters, [filterKey]: newValues, enclosures: filteredEnclosures })
		} else {
			onFiltersChange({ ...filters, [filterKey]: newValues })
		}
	}

	const handleDateRangeChange = (range: DateRange | undefined) => {
		onFiltersChange({
			...filters,
			dateFrom: range?.from ? format(range.from, 'yyyy-MM-dd') : null,
			dateTo: range?.to ? format(range.to, 'yyyy-MM-dd') : null
		})
	}

	return (
		<div className='flex flex-col gap-3'>
			{/* Search Input - Own Line */}
			<div className='relative w-full'>
				<Search className='absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
				<Input
					placeholder='Search summary or details...'
					value={searchValue}
					onChange={handleSearchChange}
					className='pl-8 w-full'
				/>
			</div>

			{/* Dropdown Filters */}
			<div className={cn('flex gap-3', isMobile ? 'flex-col' : 'flex-wrap items-center')}>
				{/* Record Type Dropdown */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant='outline' className='gap-2'>
							Type {filters.recordTypes.length > 0 && `(${filters.recordTypes.length})`}
							<ChevronDown className='h-4 w-4' />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align={isMobile ? 'start' : 'end'}>
						{RECORD_TYPE_OPTIONS.map((opt) => (
							<DropdownMenuCheckboxItem
								key={opt.value}
								checked={filters.recordTypes.includes(opt.value)}
								onSelect={(e) => e.preventDefault()}
								onCheckedChange={(checked) => handleRecordTypeToggle(opt.value, checked)}
							>
								{opt.label}
							</DropdownMenuCheckboxItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Species Dropdown */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant='outline' className='gap-2'>
							Species {filters.species.length > 0 && `(${filters.species.length})`}
							<ChevronDown className='h-4 w-4' />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align={isMobile ? 'start' : 'end'} className='max-h-[300px] overflow-y-auto'>
						{speciesOptions.map((species) => (
							<DropdownMenuCheckboxItem
								key={species}
								checked={filters.species.includes(species)}
								onSelect={(e) => e.preventDefault()}
								onCheckedChange={(checked) => handleMultiSelectToggle('species', species, checked)}
							>
								{species}
							</DropdownMenuCheckboxItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Enclosures Dropdown */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant='outline' className='gap-2'>
							Enclosures {filters.enclosures.length > 0 && `(${filters.enclosures.length})`}
							<ChevronDown className='h-4 w-4' />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align={isMobile ? 'start' : 'end'} className='max-h-[300px] overflow-y-auto'>
						{enclosureOptions.map((enclosure) => (
							<DropdownMenuCheckboxItem
								key={enclosure}
								checked={filters.enclosures.includes(enclosure)}
								onSelect={(e) => e.preventDefault()}
								onCheckedChange={(checked) => handleMultiSelectToggle('enclosures', enclosure, checked)}
							>
								{enclosure}
							</DropdownMenuCheckboxItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Users Dropdown */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant='outline' className='gap-2'>
							Users {filters.users.length > 0 && `(${filters.users.length})`}
							<ChevronDown className='h-4 w-4' />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align={isMobile ? 'start' : 'end'} className='max-h-[300px] overflow-y-auto'>
						{userOptions.map((user) => (
							<DropdownMenuCheckboxItem
								key={user}
								checked={filters.users.includes(user)}
								onSelect={(e) => e.preventDefault()}
								onCheckedChange={(checked) => handleMultiSelectToggle('users', user, checked)}
							>
								{user}
							</DropdownMenuCheckboxItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Task Type Dropdown */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant='outline' className='gap-2'>
							Task Type {filters.taskTypes.length > 0 && `(${filters.taskTypes.length})`}
							<ChevronDown className='h-4 w-4' />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align={isMobile ? 'start' : 'end'} className='max-h-[300px] overflow-y-auto'>
						{taskTypeOptions.map((taskType) => (
							<DropdownMenuCheckboxItem
								key={taskType}
								checked={filters.taskTypes.includes(taskType)}
								onSelect={(e) => e.preventDefault()}
								onCheckedChange={(checked) => handleMultiSelectToggle('taskTypes', taskType, checked)}
							>
								{taskType}
							</DropdownMenuCheckboxItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Date Range Picker */}
				<Popover>
					<PopoverTrigger asChild>
						<Button variant='outline' className='gap-2'>
							<CalendarIcon className='h-4 w-4' />
							{dateRange?.from ? (
								dateRange.to ? (
									<>
										{format(dateRange.from, 'LLL dd')} - {format(dateRange.to, 'LLL dd')}
									</>
								) : (
									format(dateRange.from, 'LLL dd, y')
								)
							) : (
								'Date Range'
							)}
						</Button>
					</PopoverTrigger>
					<PopoverContent className='w-auto p-0' align={isMobile ? 'start' : 'end'}>
						<Calendar
							initialFocus
							mode='range'
							defaultMonth={dateRange?.from}
							selected={dateRange}
							onSelect={handleDateRangeChange}
							numberOfMonths={isMobile ? 1 : 2}
						/>
					</PopoverContent>
				</Popover>

				{/* Spacer + Reset Button */}
				<div className='flex-1' />

				{hasActiveFilters && (
					<Button variant='ghost' onClick={onReset} className='gap-1.5'>
						<X className='h-4 w-4' />
						Reset
					</Button>
				)}

				{/* Export Button */}
				<Button variant='outline' onClick={onExport} className='gap-2'>
					<Download className='h-4 w-4' />
					Export CSV
				</Button>
			</div>
		</div>
	)
}

// ============================================================================
// Main Table Component
// ============================================================================

export function TasksTable({ orgId }: { orgId: UUID }) {
	const isMobile = useIsMobile()
	const [filters, setFilters] = React.useState<TimelineFilters>(DEFAULT_FILTERS)
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'event_date', desc: true }])
	const [measuredRowHeight, setMeasuredRowHeight] = React.useState<number | null>(null)
	const [isMounted, setIsMounted] = React.useState(false)

	const rowRef = React.useRef<HTMLTableRowElement | null>(null)
	const measuredRef = React.useRef(false)

	const MAX_TABLE_HEIGHT = isMobile ? MAX_TABLE_HEIGHT_MOBILE : MAX_TABLE_HEIGHT_DESKTOP
	const TARGET_VISIBLE_ROWS = isMobile ? TARGET_VISIBLE_ROWS_MOBILE : TARGET_VISIBLE_ROWS_DESKTOP
	const ESTIMATED_ROW_HEIGHT = isMobile ? ESTIMATED_ROW_HEIGHT_MOBILE : ESTIMATED_ROW_HEIGHT_DESKTOP

	const { data = [], isLoading } = useOrgTaskHistory(orgId)

	React.useEffect(() => {
		setIsMounted(true)
	}, [])

	const filteredData = React.useMemo(() => {
		return data.filter((row) => {
			if (filters.searchQuery) {
				const q = filters.searchQuery.toLowerCase()
				const matchesSummary = row.summary?.toLowerCase().includes(q) ?? false
				const matchesDetails = row.details?.toLowerCase().includes(q) ?? false
				if (!matchesSummary && !matchesDetails) return false
			}
			if (filters.recordTypes.length > 0 && !filters.recordTypes.includes(row.record_type)) return false
			if (filters.species.length > 0 && (!row.species_name || !filters.species.includes(row.species_name))) return false
			if (filters.enclosures.length > 0 && (!row.enclosure_name || !filters.enclosures.includes(row.enclosure_name)))
				return false
			if (filters.users.length > 0 && (!row.user_name || !filters.users.includes(row.user_name))) return false
			if (filters.taskTypes.length > 0 && (!row.template_type || !filters.taskTypes.includes(row.template_type)))
				return false
			if (filters.dateFrom) {
				const eventDate = new Date(row.event_date)
				const fromDate = new Date(filters.dateFrom + 'T00:00:00.000Z')
				if (eventDate < fromDate) return false
			}
			if (filters.dateTo) {
				const eventDate = new Date(row.event_date)
				const toDate = new Date(filters.dateTo + 'T23:59:59.999Z')
				if (eventDate > toDate) return false
			}
			return true
		})
	}, [data, filters])

	const hasActiveFilters = React.useMemo(() => {
		return (
			filters.recordTypes.length > 0 ||
			filters.species.length > 0 ||
			filters.enclosures.length > 0 ||
			filters.users.length > 0 ||
			filters.taskTypes.length > 0 ||
			filters.dateFrom !== null ||
			filters.dateTo !== null ||
			filters.searchQuery !== ''
		)
	}, [filters])

	const handleReset = () => setFilters(DEFAULT_FILTERS)
	const handleExport = () => exportToCsv(filteredData)

	const columns = React.useMemo(() => getTimelineColumns(isMobile), [isMobile])

	const table = useReactTable({
		data: filteredData,
		columns,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	const rows = table.getRowModel().rows

	// Measure first rendered row height for accurate virtuoso sizing
	React.useLayoutEffect(() => {
		if (!measuredRef.current && rowRef.current) {
			const height = rowRef.current.getBoundingClientRect().height
			if (height > 0) {
				setMeasuredRowHeight(height)
				measuredRef.current = true
			}
		}
	})

	const tableHeight = Math.min(
		MAX_TABLE_HEIGHT,
		HEADER_HEIGHT + filteredData.length * (measuredRowHeight ?? ESTIMATED_ROW_HEIGHT)
	)

	if (!isMounted) return null

	return (
		<div className='w-full space-y-4'>
			<FiltersBar
				filters={filters}
				onFiltersChange={setFilters}
				hasActiveFilters={hasActiveFilters}
				onReset={handleReset}
				onExport={handleExport}
				data={data}
			/>

			<div className='rounded-lg border border-border/50 bg-card overflow-hidden'>
				{isLoading ? (
					<div className='flex flex-col items-center justify-center h-48 w-full gap-2'>
						<LoaderCircle className='h-8 w-8 animate-spin text-muted-foreground' />
					</div>
				) : rows.length === 0 ? (
					<div className='flex items-center justify-center h-24 text-muted-foreground text-sm'>
						{hasActiveFilters ? 'No records match your filters.' : 'No completed tasks found.'}
					</div>
				) : rows.length <= TARGET_VISIBLE_ROWS ? (
					<table
						style={{ borderCollapse: 'collapse', width: '100%', ...(isMobile ? { tableLayout: 'fixed' } : {}) }}
						className='caption-bottom text-sm w-full'
					>
						<thead className='[&_tr]:border-b'>
							{table.getHeaderGroups().map((headerGroup) => (
								<tr key={headerGroup.id} className='border-b bg-muted shadow-sm'>
									{headerGroup.headers.map((header) => (
										<th
											key={header.id}
											className={`h-12 ${isMobile ? 'px-2' : 'px-4'} text-left align-middle font-medium text-muted-foreground`}
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
									className={`border-b transition-colors hover:bg-muted/50 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}
								>
									{row.getVisibleCells().map((cell) => (
										<td key={cell.id} className={`${isMobile ? 'py-6 px-2' : 'py-3 px-4'} align-middle`}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				) : (
					<TableVirtuoso
						style={{ height: tableHeight }}
						totalCount={rows.length}
						className='scrollbar-no-track'
						components={{
							Table: ({ style, ...props }) => (
								<table
									{...props}
									style={{
										...style,
										borderCollapse: 'collapse',
										width: '100%',
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
								const isEven = index % 2 === 0
								return (
									<tr
										{...props}
										ref={index === 0 ? rowRef : undefined}
										style={style}
										className={`border-b transition-colors hover:bg-muted/50 ${isEven ? 'bg-background' : 'bg-muted/30'}`}
									>
										{row.getVisibleCells().map((cell) => (
											<td key={cell.id} className={`${isMobile ? 'py-6 px-2' : 'py-3 px-4'} align-middle`}>
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
											className={`h-12 ${isMobile ? 'px-2' : 'px-4'} text-left align-middle font-medium text-muted-foreground`}
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

			<div className='text-sm text-muted-foreground'>{rows.length} completed tasks</div>
		</div>
	)
}
