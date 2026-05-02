'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { ChevronDown, Download, Search, SlidersHorizontal, X, CalendarIcon } from 'lucide-react'
import { type DateRange } from 'react-day-picker'
import { useIsMobile } from '@/hooks/use-mobile'
import { type ActivityLogEntry } from '@/lib/react-query/queries'
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
import { GlobalSearchToggle } from '@/components/tasks/global-search-toggle'
import { UserHistoryFilterButton } from './user-history-filter-button'
import { type UserActionFilters } from './user-history-constants'

// ============================================================================
// Local option lists
// ============================================================================

const ACTION_OPTIONS = ['create', 'update', 'delete', 'deactivate']
const ENTITY_TYPE_OPTIONS = ['task', 'enclosure', 'org_species', 'enclosure_schedule', 'membership']

function toLabel(s: string) {
	return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ============================================================================
// Filter bar
// ============================================================================

type UserActionsFilterBarProps = {
	filters: UserActionFilters
	onFiltersChange: (f: UserActionFilters) => void
	hasActiveFilters: boolean
	onReset: () => void
	onExport: () => void
	data: ActivityLogEntry[]
	globalSearch: boolean
	onGlobalSearchChange: (val: boolean) => void
	onDateRangeCommit: (from: string | null, to: string | null) => void
}

export function UserActionsFilterBar({
	filters,
	onFiltersChange,
	hasActiveFilters,
	onReset,
	onExport,
	data,
	globalSearch,
	onGlobalSearchChange,
	onDateRangeCommit
}: UserActionsFilterBarProps) {
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
			<div className='flex gap-2 items-center'>
				<div className='relative flex-1'>
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
				<UserHistoryFilterButton
					filters={filters}
					onFiltersChange={onFiltersChange}
					hasActiveFilters={hasActiveFilters}
					onReset={onReset}
					data={data}
					trigger={
						<Button variant={hasActiveFilters ? 'default' : 'outline'} size='sm' className='h-9 gap-1.5 shrink-0'>
							<SlidersHorizontal className='h-3.5 w-3.5' />
							Filter
							{hasActiveFilters
								? ` (${
										[
											filters.actions.length > 0,
											filters.entityTypes.length > 0,
											filters.users.length > 0,
											filters.dateFrom !== null
										].filter(Boolean).length
									})`
								: ''}
						</Button>
					}
				/>
				<Button variant='outline' size='sm' className='h-9 w-9 p-0 shrink-0' onClick={onExport} title='Export CSV'>
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
