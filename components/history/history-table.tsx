'use client'

import { type TimelineFilters, useOrgTaskHistory } from '@/lib/react-query/queries'
import { UUID } from 'crypto'
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
import { useIsMobile } from '@/hooks/use-mobile'
import { getTimelineColumns } from './history-columns'
import { HistoryFilters } from './history-filters'
import { exportToCsv } from './history-export'
import {
	DEFAULT_FILTERS,
	MAX_TABLE_HEIGHT_DESKTOP,
	MAX_TABLE_HEIGHT_MOBILE,
	TARGET_VISIBLE_ROWS_DESKTOP,
	TARGET_VISIBLE_ROWS_MOBILE,
	HEADER_HEIGHT,
	ESTIMATED_ROW_HEIGHT_DESKTOP,
	ESTIMATED_ROW_HEIGHT_MOBILE
} from './history-constants'

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
			<HistoryFilters
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
										className={`group border-b transition-colors hover:bg-orange-300/20 dark:hover:bg-orange-400/30 active:bg-orange-100 dark:active:bg-orange-950/30 ${isEven ? 'bg-background' : 'bg-muted/70'}`}
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
											className={`h-12 ${isMobile ? 'px-2' : 'px-4'} text-left align-middle font-bold text-muted-foreground`}
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

			<div className='text-sm text-muted-foreground'>{rows.length} history logs</div>
		</div>
	)
}
