'use client'

import * as React from 'react'
import { type Table, type Row, flexRender } from '@tanstack/react-table'
import { TableVirtuoso } from 'react-virtuoso'
import { LoaderCircle } from 'lucide-react'
import { format } from 'date-fns'
import {
	MAX_TABLE_HEIGHT_DESKTOP,
	MAX_TABLE_HEIGHT_MOBILE,
	TARGET_VISIBLE_ROWS_DESKTOP,
	TARGET_VISIBLE_ROWS_MOBILE,
	HEADER_HEIGHT,
	ESTIMATED_ROW_HEIGHT_DESKTOP,
	ESTIMATED_ROW_HEIGHT_MOBILE
} from './history-constants'

// ============================================================================
// Generic shared table renderer — used by both HistoryTable and UserActionsTable
// ============================================================================

interface SharedHistoryTableProps<T> {
	table: Table<T>
	rows: Row<T>[]
	isLoading: boolean
	hasActiveFilters: boolean
	/** Shown when there are no rows and no active filters */
	emptyMessage: string
	/** Label after the row count in the footer, e.g. "history logs" */
	countLabel: string
	/** Filter bar rendered above the table (HistoryFilters or UserActionsFilterBar) */
	filterBar: React.ReactNode
	/** Length of the filtered dataset — used for height calculation */
	filteredDataLength: number
	globalSearch: boolean
	dateFrom: string | null
	dateTo: string | null
	isMobile: boolean
	getColWidthStyle: (colId: string) => React.CSSProperties | undefined
}

export function SharedHistoryTable<T>({
	table,
	rows,
	isLoading,
	hasActiveFilters,
	emptyMessage,
	countLabel,
	filterBar,
	filteredDataLength,
	globalSearch,
	dateFrom,
	dateTo,
	isMobile,
	getColWidthStyle
}: SharedHistoryTableProps<T>) {
	const [measuredRowHeight, setMeasuredRowHeight] = React.useState<number | null>(null)
	const rowRef = React.useRef<HTMLTableRowElement | null>(null)
	const measuredRef = React.useRef(false)

	const MAX_TABLE_HEIGHT = isMobile ? MAX_TABLE_HEIGHT_MOBILE : MAX_TABLE_HEIGHT_DESKTOP
	const TARGET_VISIBLE_ROWS = isMobile ? TARGET_VISIBLE_ROWS_MOBILE : TARGET_VISIBLE_ROWS_DESKTOP
	const ESTIMATED_ROW_HEIGHT = isMobile ? ESTIMATED_ROW_HEIGHT_MOBILE : ESTIMATED_ROW_HEIGHT_DESKTOP

	// Measure first rendered row height for accurate virtuoso sizing
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
		HEADER_HEIGHT + filteredDataLength * (measuredRowHeight ?? ESTIMATED_ROW_HEIGHT)
	)

	return (
		<div className='w-full space-y-4'>
			{filterBar}

			<div className='rounded-lg border border-border/50 bg-card overflow-x-auto'>
				{isLoading ? (
					<div className='flex flex-col items-center justify-center h-48 w-full gap-2'>
						<LoaderCircle className='h-8 w-8 animate-spin text-muted-foreground' />
					</div>
				) : rows.length === 0 ? (
					<div className='flex items-center justify-center h-24 text-muted-foreground text-sm'>
						{hasActiveFilters ? 'No records match your filters.' : emptyMessage}
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
				<span>
					{rows.length} {countLabel}
				</span>
				{globalSearch ? (
					<span className='text-xs'>Showing all time</span>
				) : dateFrom || dateTo ? (
					<span className='text-xs'>
						{dateFrom && dateTo
							? `Showing ${format(new Date(dateFrom + 'T00:00:00'), 'MMM d, yyyy')} – ${format(new Date(dateTo + 'T00:00:00'), 'MMM d, yyyy')}`
							: dateFrom
								? `Showing from ${format(new Date(dateFrom + 'T00:00:00'), 'MMM d, yyyy')}`
								: `Showing until ${format(new Date(dateTo! + 'T00:00:00'), 'MMM d, yyyy')}`}
					</span>
				) : (
					<span className='text-xs'>Showing last 14 days</span>
				)}
			</div>
		</div>
	)
}
