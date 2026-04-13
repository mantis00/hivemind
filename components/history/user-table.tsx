'use client'

import { useOrgUserActions, useOrgUserActionsInRange, type ActivityLogEntry } from '@/lib/react-query/queries'
import { UUID } from 'crypto'
import * as React from 'react'
import { format, subDays } from 'date-fns'
import {
	type ColumnDef,
	type SortingState,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	useReactTable
} from '@tanstack/react-table'
import { TableVirtuoso } from 'react-virtuoso'
import { LoaderCircle, ChevronDown, Search, X, Download, CalendarIcon, ArrowUpDown } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { exportActivityLogToCsv } from './history-export'
import {
	MAX_TABLE_HEIGHT_DESKTOP,
	MAX_TABLE_HEIGHT_MOBILE,
	TARGET_VISIBLE_ROWS_DESKTOP,
	TARGET_VISIBLE_ROWS_MOBILE,
	HEADER_HEIGHT,
	ESTIMATED_ROW_HEIGHT_DESKTOP,
	ESTIMATED_ROW_HEIGHT_MOBILE
} from './history-constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { VirtualizedCommand, type VirtualizedOption } from '@/components/ui/virtualized-combobox'
import { cn } from '@/lib/utils'
import { type DateRange } from 'react-day-picker'
import { GlobalSearchToggle } from '@/components/tasks/global-search-toggle'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// ============================================================================
// Column styles
// ============================================================================

const ACTION_STYLES: Record<string, string> = {
	create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
	update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
	delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
	deactivate: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
}

const ENTITY_TYPE_STYLES: Record<string, string> = {
	task: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
	enclosure: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
	org_species: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
	enclosure_schedule: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
	membership: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
}

const ACTION_OPTIONS = ['create', 'update', 'delete', 'deactivate']
const ENTITY_TYPE_OPTIONS = ['task', 'enclosure', 'org_species', 'enclosure_schedule', 'membership']

function toLabel(s: string) {
	return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ============================================================================
// Truncated cell with overflow tooltip
// ============================================================================

function TCell({ text, className }: { text: string; className?: string }) {
	const ref = React.useRef<HTMLSpanElement>(null)
	const [open, setOpen] = React.useState(false)
	return (
		<TooltipProvider>
			<Tooltip
				open={open}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						setOpen(false)
						return
					}
					if (ref.current && ref.current.scrollWidth > ref.current.clientWidth) setOpen(true)
				}}
			>
				<TooltipTrigger asChild>
					<span ref={ref} className={cn('block truncate', className)}>
						{text}
					</span>
				</TooltipTrigger>
				<TooltipContent className='max-w-xs'>
					<p className='text-sm'>{text}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}

// ============================================================================
// Column definitions
// ============================================================================

function SortBtn({
	column,
	label
}: {
	column: import('@tanstack/react-table').Column<ActivityLogEntry>
	label: string
}) {
	return (
		<Button
			variant='ghost'
			onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
			className='-ml-3 h-8 gap-1'
		>
			{label}
			<ArrowUpDown className='h-3.5 w-3.5' />
		</Button>
	)
}

function getActivityLogColumns(): ColumnDef<ActivityLogEntry>[] {
	return [
		{
			accessorKey: 'created_at',
			id: 'created_at',
			header: ({ column }) => <SortBtn column={column} label='Date' />,
			cell: ({ row }) => {
				const v = row.getValue('created_at') as string
				return <span className='text-sm whitespace-nowrap'>{format(new Date(v), 'MMM d, yyyy')}</span>
			}
		},
		{
			accessorKey: 'action',
			header: 'Action',
			cell: ({ row }) => {
				const v = row.getValue('action') as string
				const cls = ACTION_STYLES[v] ?? 'bg-muted text-muted-foreground'
				return (
					<span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', cls)}>
						{toLabel(v)}
					</span>
				)
			}
		},
		{
			accessorKey: 'entity_type',
			header: 'Entity',
			cell: ({ row }) => {
				const v = row.getValue('entity_type') as string
				const cls = ENTITY_TYPE_STYLES[v] ?? 'bg-muted text-muted-foreground'
				return (
					<span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', cls)}>
						{toLabel(v)}
					</span>
				)
			}
		},
		{
			accessorKey: 'entity_name',
			header: 'Name',
			cell: ({ row }) => {
				const v = row.getValue('entity_name') as string | null
				if (!v) return <span className='text-muted-foreground'>—</span>
				return <TCell text={v} className='text-sm' />
			}
		},
		{
			accessorKey: 'summary',
			header: 'Summary',
			cell: ({ row }) => {
				const v = row.getValue('summary') as string | null
				if (!v) return <span className='text-muted-foreground'>—</span>
				return <TCell text={v} className='text-sm' />
			}
		},
		{
			accessorKey: 'actor_name',
			header: 'User',
			cell: ({ row }) => {
				const v = row.getValue('actor_name') as string | null
				if (!v) return <span className='text-sm'>—</span>
				return <TCell text={v} className='text-sm' />
			}
		}
	]
}

// ============================================================================
// Col widths (reuse desktop/mobile maps, add any missing keys inline)
// ============================================================================

const USER_TABLE_DESKTOP_WIDTHS: Record<string, string> = {
	created_at: '115px',
	action: '90px',
	entity_type: '120px',
	entity_name: '180px',
	summary: '240px',
	actor_name: '130px'
}

const USER_TABLE_MOBILE_WIDTHS: Record<string, string> = {
	created_at: '85px',
	action: '80px',
	entity_type: '100px',
	entity_name: '140px',
	summary: '180px',
	actor_name: '100px'
}

// ============================================================================
// Filter state
// ============================================================================

type UserActionFilters = {
	searchQuery: string
	actions: string[]
	entityTypes: string[]
	users: string[]
	dateFrom: string | null
	dateTo: string | null
}

const DEFAULT_FILTERS: UserActionFilters = {
	searchQuery: '',
	actions: [],
	entityTypes: [],
	users: [],
	dateFrom: null,
	dateTo: null
}

// ============================================================================
// Filter bar
// ============================================================================

function UserActionsFilterBar({
	filters,
	onFiltersChange,
	hasActiveFilters,
	onReset,
	onExport,
	data,
	globalSearch,
	onGlobalSearchChange,
	onDateRangeCommit
}: {
	filters: UserActionFilters
	onFiltersChange: (f: UserActionFilters) => void
	hasActiveFilters: boolean
	onReset: () => void
	onExport: () => void
	data: ActivityLogEntry[]
	globalSearch: boolean
	onGlobalSearchChange: (v: boolean) => void
	onDateRangeCommit: (from: string | null, to: string | null) => void
}) {
	const isMobile = useIsMobile()
	const [searchValue, setSearchValue] = React.useState(filters.searchQuery)
	const [datePickerOpen, setDatePickerOpen] = React.useState(false)

	const dateRange: DateRange | undefined = React.useMemo(() => {
		if (filters.dateFrom && filters.dateTo) {
			return { from: new Date(filters.dateFrom + 'T00:00:00'), to: new Date(filters.dateTo + 'T00:00:00') }
		}
		return undefined
	}, [filters.dateFrom, filters.dateTo])

	const userOptions = React.useMemo<VirtualizedOption[]>(() => {
		const unique = [...new Set(data.map((r) => r.actor_name).filter(Boolean))] as string[]
		return unique.sort().map((u) => ({ value: u, label: u }))
	}, [data])

	const handleDateRangeChange = (range: DateRange | undefined) => {
		const from = range?.from ? format(range.from, 'yyyy-MM-dd') : null
		const to = range?.to ? format(range.to, 'yyyy-MM-dd') : null
		onFiltersChange({ ...filters, dateFrom: from, dateTo: to })
		if (from && to) {
			setDatePickerOpen(false)
			onDateRangeCommit(from, to)
		}
		if (!range) onDateRangeCommit(null, null)
	}

	if (isMobile) {
		return (
			<div className='flex gap-2 items-center flex-wrap'>
				<div className='relative flex-1 min-w-40'>
					<Search className='absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
					<Input
						placeholder='Search...'
						value={searchValue}
						onChange={(e) => {
							setSearchValue(e.target.value)
							onFiltersChange({ ...filters, searchQuery: e.target.value })
						}}
						className='pl-8 h-9'
					/>
				</div>
				<GlobalSearchToggle
					globalSearch={globalSearch}
					onGlobalSearchChange={onGlobalSearchChange}
					dialogDescription='By default, only the last 14 days of activity are fetched. Enabling this will load all records across all dates.'
				/>
				<Button
					variant='outline'
					size='sm'
					className='h-9 w-9 p-0 shrink-0 ml-auto'
					onClick={onExport}
					title='Export CSV'
				>
					<Download className='h-3.5 w-3.5' />
				</Button>
			</div>
		)
	}

	return (
		<div className='flex flex-col gap-3'>
			<div className='flex items-center gap-2'>
				<div className='relative flex-1 min-w-40 max-w-72'>
					<Search className='absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
					<Input
						placeholder='Search name or summary...'
						value={searchValue}
						onChange={(e) => {
							setSearchValue(e.target.value)
							onFiltersChange({ ...filters, searchQuery: e.target.value })
						}}
						className='pl-8 w-full'
					/>
				</div>
				<GlobalSearchToggle
					globalSearch={globalSearch}
					onGlobalSearchChange={onGlobalSearchChange}
					dialogDescription='By default, only the last 14 days of activity are fetched. Enabling this will load all records across all dates.'
				/>
			</div>

			<div className={cn('flex gap-3 flex-wrap items-center')}>
				{/* Action */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant='outline' className='gap-2'>
							Action {filters.actions.length > 0 && `(${filters.actions.length})`}
							<ChevronDown className='h-4 w-4' />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align='end'>
						{ACTION_OPTIONS.map((opt) => (
							<DropdownMenuCheckboxItem
								key={opt}
								checked={filters.actions.includes(opt)}
								onSelect={(e) => e.preventDefault()}
								onCheckedChange={(checked) => {
									const next = checked ? [...filters.actions, opt] : filters.actions.filter((a) => a !== opt)
									onFiltersChange({ ...filters, actions: next })
								}}
							>
								{toLabel(opt)}
							</DropdownMenuCheckboxItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Entity Type */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant='outline' className='gap-2'>
							Entity {filters.entityTypes.length > 0 && `(${filters.entityTypes.length})`}
							<ChevronDown className='h-4 w-4' />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align='end'>
						{ENTITY_TYPE_OPTIONS.map((opt) => (
							<DropdownMenuCheckboxItem
								key={opt}
								checked={filters.entityTypes.includes(opt)}
								onSelect={(e) => e.preventDefault()}
								onCheckedChange={(checked) => {
									const next = checked ? [...filters.entityTypes, opt] : filters.entityTypes.filter((e) => e !== opt)
									onFiltersChange({ ...filters, entityTypes: next })
								}}
							>
								{toLabel(opt)}
							</DropdownMenuCheckboxItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Users */}
				<Popover>
					<PopoverTrigger asChild>
						<Button variant='outline' className='gap-2' disabled={userOptions.length === 0}>
							Users {filters.users.length > 0 && `(${filters.users.length})`}
							<ChevronDown className='h-4 w-4' />
						</Button>
					</PopoverTrigger>
					<PopoverContent className='w-56 p-0' align='end'>
						<div className='**:data-[slot=command-group]:p-0 **:data-[slot=command-item]:pl-3 **:data-[slot=command-item]:pr-2 **:data-[slot=command-item]:cursor-pointer'>
							<VirtualizedCommand
								height='240px'
								options={userOptions}
								placeholder='Search users...'
								selectedOptions={filters.users}
								emptyMessage='No users found.'
								onSelectOption={(value) => {
									const checked = !filters.users.includes(value)
									const next = checked ? [...filters.users, value] : filters.users.filter((u) => u !== value)
									onFiltersChange({ ...filters, users: next })
								}}
							/>
						</div>
					</PopoverContent>
				</Popover>

				{/* Date Range */}
				<Popover
					open={datePickerOpen}
					onOpenChange={(open) => {
						if (!open && dateRange?.from && !dateRange?.to) {
							onFiltersChange({
								...filters,
								dateFrom: format(dateRange.from, 'yyyy-MM-dd'),
								dateTo: format(dateRange.from, 'yyyy-MM-dd')
							})
						}
						setDatePickerOpen(open)
					}}
				>
					<PopoverTrigger asChild>
						<Button variant={dateRange?.from && dateRange?.to ? 'secondary' : 'outline'} className='gap-2'>
							<CalendarIcon className='h-4 w-4' />
							{dateRange?.from && dateRange?.to
								? `${format(dateRange.from, 'LLL dd')} – ${format(dateRange.to, 'LLL dd')}`
								: 'Date range'}
						</Button>
					</PopoverTrigger>
					<PopoverContent className='w-auto p-0' align='end'>
						<Calendar mode='range' selected={dateRange} onSelect={handleDateRangeChange} numberOfMonths={2} />
					</PopoverContent>
				</Popover>

				<div className='flex-1' />

				{hasActiveFilters && (
					<Button variant='ghost' onClick={onReset} className='gap-1.5'>
						<X className='h-4 w-4' />
						Reset
					</Button>
				)}

				<Button variant='outline' onClick={onExport} className='gap-2'>
					<Download className='h-4 w-4' />
					Export CSV
				</Button>
			</div>
		</div>
	)
}

// ============================================================================
// Inner table component
// ============================================================================

function UserActionsTableInner({
	orgId,
	globalSearch,
	onGlobalSearchChange,
	initialDateFrom,
	initialDateTo,
	onDateRangeCommit
}: {
	orgId: UUID
	globalSearch: boolean
	onGlobalSearchChange: (val: boolean) => void
	initialDateFrom: string | null
	initialDateTo: string | null
	onDateRangeCommit: (from: string | null, to: string | null) => void
}) {
	const isMobile = useIsMobile()
	const [filters, setFilters] = React.useState<UserActionFilters>({
		...DEFAULT_FILTERS,
		dateFrom: initialDateFrom,
		dateTo: initialDateTo
	})
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'created_at', desc: true }])
	const [measuredRowHeight, setMeasuredRowHeight] = React.useState<number | null>(null)
	const [isMounted, setIsMounted] = React.useState(false)

	const rowRef = React.useRef<HTMLTableRowElement | null>(null)
	const measuredRef = React.useRef(false)

	const getColWidthStyle = React.useCallback(
		(colId: string): React.CSSProperties | undefined => {
			const w = (isMobile ? USER_TABLE_MOBILE_WIDTHS : USER_TABLE_DESKTOP_WIDTHS)[colId]
			if (!w) return undefined
			return isMobile ? { width: w, minWidth: w, maxWidth: w } : { minWidth: w }
		},
		[isMobile]
	)

	const MAX_TABLE_HEIGHT = isMobile ? MAX_TABLE_HEIGHT_MOBILE : MAX_TABLE_HEIGHT_DESKTOP
	const TARGET_VISIBLE_ROWS = isMobile ? TARGET_VISIBLE_ROWS_MOBILE : TARGET_VISIBLE_ROWS_DESKTOP
	const ESTIMATED_ROW_HEIGHT = isMobile ? ESTIMATED_ROW_HEIGHT_MOBILE : ESTIMATED_ROW_HEIGHT_DESKTOP

	const defaultStartDate = React.useMemo(() => format(subDays(new Date(), 14), 'yyyy-MM-dd'), [])
	const defaultEndDate = React.useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

	const { data: rangeData = [], isLoading: rangeLoading } = useOrgUserActionsInRange(
		!globalSearch ? orgId : undefined,
		filters.dateFrom ?? defaultStartDate,
		filters.dateTo ?? defaultEndDate
	)
	const { data: allData = [], isLoading: allLoading } = useOrgUserActions(globalSearch ? orgId : undefined)

	const data = globalSearch ? allData : rangeData
	const isLoading = globalSearch ? allLoading : rangeLoading

	React.useEffect(() => {
		setIsMounted(true)
	}, [])

	const filteredData = React.useMemo(() => {
		return data.filter((row) => {
			if (filters.searchQuery) {
				const q = filters.searchQuery.toLowerCase()
				const matchesName = row.entity_name?.toLowerCase().includes(q) ?? false
				const matchesSummary = row.summary?.toLowerCase().includes(q) ?? false
				if (!matchesName && !matchesSummary) return false
			}
			if (filters.actions.length > 0 && !filters.actions.includes(row.action)) return false
			if (filters.entityTypes.length > 0 && !filters.entityTypes.includes(row.entity_type)) return false
			if (filters.users.length > 0 && (!row.actor_name || !filters.users.includes(row.actor_name))) return false
			if (filters.dateFrom) {
				const eventDate = new Date(row.created_at)
				if (eventDate < new Date(filters.dateFrom + 'T00:00:00.000Z')) return false
			}
			if (filters.dateTo) {
				const eventDate = new Date(row.created_at)
				if (eventDate > new Date(filters.dateTo + 'T23:59:59.999Z')) return false
			}
			return true
		})
	}, [data, filters])

	const hasActiveFilters = React.useMemo(
		() =>
			filters.actions.length > 0 ||
			filters.entityTypes.length > 0 ||
			filters.users.length > 0 ||
			filters.dateFrom !== null ||
			filters.dateTo !== null ||
			filters.searchQuery !== '',
		[filters]
	)

	const handleReset = () => {
		setFilters(DEFAULT_FILTERS)
		onDateRangeCommit(null, null)
	}
	const handleExport = () => exportActivityLogToCsv(filteredData)

	const columns = React.useMemo(() => getActivityLogColumns(), [])

	// eslint-disable-next-line react-hooks/incompatible-library
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

	React.useLayoutEffect(() => {
		if (!measuredRef.current && rowRef.current) {
			const height = rowRef.current.getBoundingClientRect().height
			if (height > 0) {
				setMeasuredRowHeight(height)
				measuredRef.current = true
			}
		}
	}, [rows])

	const tableHeight = Math.min(
		MAX_TABLE_HEIGHT,
		HEADER_HEIGHT + filteredData.length * (measuredRowHeight ?? ESTIMATED_ROW_HEIGHT)
	)

	if (!isMounted) return null

	return (
		<div className='w-full space-y-4'>
			<UserActionsFilterBar
				filters={filters}
				onFiltersChange={setFilters}
				hasActiveFilters={hasActiveFilters}
				onReset={handleReset}
				onExport={handleExport}
				data={data}
				globalSearch={globalSearch}
				onGlobalSearchChange={onGlobalSearchChange}
				onDateRangeCommit={onDateRangeCommit}
			/>

			<div className='rounded-lg border border-border/50 bg-card overflow-x-auto'>
				{isLoading ? (
					<div className='flex flex-col items-center justify-center h-48 w-full gap-2'>
						<LoaderCircle className='h-8 w-8 animate-spin text-muted-foreground' />
					</div>
				) : rows.length === 0 ? (
					<div className='flex items-center justify-center h-24 text-muted-foreground text-sm'>
						{hasActiveFilters ? 'No records match your filters.' : 'No activity found.'}
					</div>
				) : rows.length <= TARGET_VISIBLE_ROWS ? (
					<table
						style={{
							borderCollapse: 'collapse',
							width: isMobile ? '100%' : 'auto',
							minWidth: '100%',
							...(isMobile ? { tableLayout: 'fixed' } : {})
						}}
						className='caption-bottom text-sm w-full'
					>
						<thead className='[&_tr]:border-b'>
							{table.getHeaderGroups().map((headerGroup) => (
								<tr key={headerGroup.id} className='border-b bg-muted shadow-sm'>
									{headerGroup.headers.map((header) => (
										<th
											key={header.id}
											style={getColWidthStyle(header.id)}
											className={`h-12 ${isMobile ? 'px-2' : 'px-4'} text-left align-middle font-bold text-muted-foreground`}
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
									className={`group border-b transition-colors hover:bg-orange-300/20 dark:hover:bg-orange-400/30 active:bg-orange-100 dark:active:bg-orange-950/30 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/70'}`}
								>
									{row.getVisibleCells().map((cell) => (
										<td
											key={cell.id}
											style={getColWidthStyle(cell.column.id)}
											className={`${isMobile ? 'py-6 px-2' : 'py-3 px-4'} align-middle`}
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
										width: isMobile ? '100%' : 'auto',
										minWidth: '100%',
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
										className={`group border-b transition-colors hover:bg-orange-300/20 dark:hover:bg-orange-400/30 active:bg-orange-100 dark:active:bg-orange-950/30 ${isEven ? 'bg-background' : 'bg-muted/70'}`}
									>
										{row.getVisibleCells().map((cell) => (
											<td
												key={cell.id}
												style={getColWidthStyle(cell.column.id)}
												className={`${isMobile ? 'py-6 px-2' : 'py-3 px-4'} align-middle overflow-hidden`}
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
											className={`h-12 ${isMobile ? 'px-2' : 'px-4'} text-left align-middle font-bold text-muted-foreground overflow-hidden`}
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

			<div className='flex items-center justify-between text-sm text-muted-foreground'>
				<span>{rows.length} activity logs</span>
				{globalSearch ? (
					<span className='text-xs'>Showing all time</span>
				) : filters.dateFrom || filters.dateTo ? (
					<span className='text-xs'>
						{filters.dateFrom && filters.dateTo
							? `Showing ${format(new Date(filters.dateFrom + 'T00:00:00'), 'MMM d, yyyy')} – ${format(new Date(filters.dateTo + 'T00:00:00'), 'MMM d, yyyy')}`
							: filters.dateFrom
								? `Showing from ${format(new Date(filters.dateFrom + 'T00:00:00'), 'MMM d, yyyy')}`
								: `Showing until ${format(new Date(filters.dateTo! + 'T00:00:00'), 'MMM d, yyyy')}`}
					</span>
				) : (
					<span className='text-xs'>Showing last 14 days</span>
				)}
			</div>
		</div>
	)
}

// ============================================================================
// Exported component
// ============================================================================

export function UserActionsTable({ orgId }: { orgId: UUID }) {
	const [globalSearch, setGlobalSearch] = React.useState(false)
	const [committedDateFrom, setCommittedDateFrom] = React.useState<string | null>(null)
	const [committedDateTo, setCommittedDateTo] = React.useState<string | null>(null)

	const handleDateRangeCommit = (from: string | null, to: string | null) => {
		setCommittedDateFrom(from)
		setCommittedDateTo(to)
	}

	const innerKey = `${globalSearch}-${committedDateFrom ?? 'default'}-${committedDateTo ?? 'default'}`

	return (
		<div className='w-full'>
			<UserActionsTableInner
				key={innerKey}
				orgId={orgId}
				globalSearch={globalSearch}
				onGlobalSearchChange={setGlobalSearch}
				initialDateFrom={committedDateFrom}
				initialDateTo={committedDateTo}
				onDateRangeCommit={handleDateRangeCommit}
			/>
		</div>
	)
}
