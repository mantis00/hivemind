'use client'

import { useOrgUserActions, useOrgUserActionsInRange, type ActivityLogEntry } from '@/lib/react-query/queries'
import { UUID } from 'crypto'
import * as React from 'react'
import { format, subDays } from 'date-fns'
import {
	type SortingState,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	useReactTable
} from '@tanstack/react-table'
import { useIsMobile } from '@/hooks/use-mobile'
import { exportActivityLogToCsv } from './enclosure-history-export'
import { SharedHistoryTable } from './shared-history-table'
import { getActivityLogColumns } from './user-history-columns'
import { UserActionsFilterBar } from './user-history-filters'
import {
	type UserActionFilters,
	DEFAULT_USER_ACTION_FILTERS,
	USER_TABLE_DESKTOP_WIDTHS,
	USER_TABLE_MOBILE_WIDTHS
} from './user-history-constants'

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
		...DEFAULT_USER_ACTION_FILTERS,
		dateFrom: initialDateFrom,
		dateTo: initialDateTo
	})
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'created_at', desc: true }])
	const [isMounted, setIsMounted] = React.useState(false)

	const getColWidthStyle = React.useCallback(
		(colId: string): React.CSSProperties | undefined => {
			const w = (isMobile ? USER_TABLE_MOBILE_WIDTHS : USER_TABLE_DESKTOP_WIDTHS)[colId]
			if (!w) return undefined
			return isMobile ? { width: w, minWidth: w, maxWidth: w } : { minWidth: w }
		},
		[isMobile]
	)

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
		setFilters(DEFAULT_USER_ACTION_FILTERS)
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

	if (!isMounted) return null

	return (
		<SharedHistoryTable
			table={table}
			rows={rows}
			isLoading={isLoading}
			hasActiveFilters={hasActiveFilters}
			emptyMessage='No activity found.'
			countLabel='activity logs'
			filteredDataLength={filteredData.length}
			globalSearch={globalSearch}
			dateFrom={filters.dateFrom}
			dateTo={filters.dateTo}
			isMobile={isMobile}
			getColWidthStyle={getColWidthStyle}
			filterBar={
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
			}
		/>
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
