'use client'

import { useOrgTaskHistory, useOrgTaskHistoryInRange } from '@/lib/react-query/queries'
import { type TimelineFilters } from '@/components/history/history-filters'
import { UUID } from 'crypto'
import * as React from 'react'
import { format, subDays } from 'date-fns'
import {
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	useReactTable
} from '@tanstack/react-table'
import { useIsMobile } from '@/hooks/use-mobile'
import { getTimelineColumns } from './history-columns'
import { HistoryFilters } from './history-filters'
import { exportToCsv } from './history-export'
import { DEFAULT_FILTERS, DESKTOP_COL_WIDTHS, MOBILE_COL_WIDTHS } from './history-constants'
import { SharedHistoryTable } from './shared-history-table'

// ============================================================================
// Main Table Component
// ============================================================================

function HistoryTableInner({
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
	const [filters, setFilters] = React.useState<TimelineFilters>({
		...DEFAULT_FILTERS,
		dateFrom: initialDateFrom,
		dateTo: initialDateTo
	})
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'event_date', desc: true }])
	const [isMounted, setIsMounted] = React.useState(false)

	const getColWidthStyle = React.useCallback(
		(colId: string): React.CSSProperties | undefined => {
			const w = (isMobile ? MOBILE_COL_WIDTHS : DESKTOP_COL_WIDTHS)[colId]
			if (!w) return undefined
			return isMobile ? { width: w, minWidth: w, maxWidth: w } : { minWidth: w }
		},
		[isMobile]
	)

	// Default window: past 14 days up to today
	const defaultStartDate = React.useMemo(() => format(subDays(new Date(), 14), 'yyyy-MM-dd'), [])
	const defaultEndDate = React.useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

	// Ranged query (default) — disabled when globalSearch is on
	const { data: rangeData = [], isLoading: rangeLoading } = useOrgTaskHistoryInRange(
		!globalSearch ? orgId : undefined,
		filters.dateFrom ?? defaultStartDate,
		filters.dateTo ?? defaultEndDate
	)
	// All-time query — only fires when user explicitly enables globalSearch
	const { data: allData = [], isLoading: allLoading } = useOrgTaskHistory(globalSearch ? orgId : undefined)

	const data = globalSearch ? allData : rangeData
	const isLoading = globalSearch ? allLoading : rangeLoading

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

	const handleReset = () => {
		setFilters(DEFAULT_FILTERS)
		onDateRangeCommit(null, null)
	}
	const handleExport = () => exportToCsv(filteredData)

	const columns = React.useMemo(() => getTimelineColumns(), [])

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

	if (!isMounted) return null

	return (
		<SharedHistoryTable
			table={table}
			rows={rows}
			isLoading={isLoading}
			hasActiveFilters={hasActiveFilters}
			emptyMessage='No completed tasks or enclosure modifications found.'
			countLabel='history logs'
			filteredDataLength={filteredData.length}
			globalSearch={globalSearch}
			dateFrom={filters.dateFrom}
			dateTo={filters.dateTo}
			isMobile={isMobile}
			getColWidthStyle={getColWidthStyle}
			filterBar={
				<HistoryFilters
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
			}
		/>
	)
}

export function HistoryTable({ orgId }: { orgId: UUID }) {
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
			<HistoryTableInner
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
