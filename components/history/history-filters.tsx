'use client'

import { type TimelineFilters, TimelineRecordType, type EnclosureTimelineRow } from '@/lib/react-query/queries'
import * as React from 'react'
import { ChevronDown, Download, Search, SlidersHorizontal, X, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { useIsMobile } from '@/hooks/use-mobile'
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
import { RECORD_TYPE_OPTIONS } from './history-constants'
import { HistoryFilterButton } from './history-filter-button'
import { GlobalSearchToggle } from '@/components/tasks/global-search-toggle'

type HistoryFiltersProps = {
	filters: TimelineFilters
	onFiltersChange: (filters: TimelineFilters) => void
	hasActiveFilters: boolean
	onReset: () => void
	onExport: () => void
	data: EnclosureTimelineRow[]
	globalSearch: boolean
	onGlobalSearchChange: (val: boolean) => void
}

export function HistoryFilters({
	filters,
	onFiltersChange,
	hasActiveFilters,
	onReset,
	onExport,
	data,
	globalSearch,
	onGlobalSearchChange
}: HistoryFiltersProps) {
	const isMobile = useIsMobile()
	const [searchValue, setSearchValue] = React.useState(filters.searchQuery)

	const dateRange: DateRange | undefined = React.useMemo(() => {
		if (filters.dateFrom && filters.dateTo) {
			return { from: new Date(filters.dateFrom), to: new Date(filters.dateTo) }
		}
		return undefined
	}, [filters.dateFrom, filters.dateTo])

	const speciesOptions = React.useMemo(() => {
		const unique = [...new Set(data.map((row) => row.species_name).filter(Boolean))] as string[]
		return unique.sort()
	}, [data])

	const enclosureOptions = React.useMemo(() => {
		const filteredData =
			filters.species.length > 0
				? data.filter((row) => row.species_name && filters.species.includes(row.species_name))
				: data
		const unique = [...new Set(filteredData.map((row) => row.enclosure_name).filter(Boolean))] as string[]
		return unique.sort()
	}, [data, filters.species])

	const userOptions = React.useMemo(() => {
		const unique = [...new Set(data.map((row) => row.user_name).filter(Boolean))] as string[]
		return unique.sort()
	}, [data])

	const speciesVirtualOptions = React.useMemo<VirtualizedOption[]>(
		() => speciesOptions.map((s) => ({ value: s, label: s })),
		[speciesOptions]
	)

	const enclosureVirtualOptions = React.useMemo<VirtualizedOption[]>(
		() => enclosureOptions.map((e) => ({ value: e, label: e })),
		[enclosureOptions]
	)

	const userVirtualOptions = React.useMemo<VirtualizedOption[]>(
		() => userOptions.map((u) => ({ value: u, label: u })),
		[userOptions]
	)

	const taskTypeOptions = React.useMemo(() => {
		const unique = [...new Set(data.map((row) => row.template_type).filter(Boolean))] as string[]
		return unique.sort()
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
			{isMobile ? (
				<div className='flex gap-2 items-center'>
					{/* Search */}
					<div className='relative flex-1'>
						<Search className='absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
						<Input placeholder='Search...' value={searchValue} onChange={handleSearchChange} className='pl-8 h-9' />
					</div>{' '}
					<GlobalSearchToggle
						globalSearch={globalSearch}
						onGlobalSearchChange={onGlobalSearchChange}
						dialogDescription='By default, only the last 14 days of history are fetched. Enabling this will load all records across all dates, which may take a moment with large datasets.'
					/>{' '}
					{/* Filter button */}
					<HistoryFilterButton
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
												filters.recordTypes.length > 0,
												filters.species.length > 0,
												filters.enclosures.length > 0,
												filters.users.length > 0,
												filters.taskTypes.length > 0,
												filters.dateFrom !== null
											].filter(Boolean).length
										})`
									: ''}
							</Button>
						}
					/>
					{/* Export */}
					<Button variant='outline' size='sm' className='h-9 w-9 p-0 shrink-0' onClick={onExport} title='Export CSV'>
						<Download className='h-3.5 w-3.5' />
					</Button>
				</div>
			) : (
				<>
					{/* Search + All dates toggle */}
					<div className='flex items-center gap-2'>
						<div className='relative flex-1 min-w-40 max-w-72'>
							<Search className='absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
							<Input
								placeholder='Search summary or details...'
								value={searchValue}
								onChange={handleSearchChange}
								className='pl-8 w-full'
							/>
						</div>
						<GlobalSearchToggle
							globalSearch={globalSearch}
							onGlobalSearchChange={onGlobalSearchChange}
							dialogDescription='By default, only the last 14 days of history are fetched. Enabling this will load all records across all dates, which may take a moment with large datasets.'
						/>
					</div>

					{/* Dropdown Filters */}
					<div className={cn('flex gap-3', 'flex-wrap items-center')}>
						{/* Type */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant='outline' className='gap-2'>
									Activity Type {filters.recordTypes.length > 0 && `(${filters.recordTypes.length})`}
									<ChevronDown className='h-4 w-4' />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align='end'>
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

						{/* Species */}
						<Popover>
							<PopoverTrigger asChild>
								<Button variant='outline' className='gap-2'>
									Species {filters.species.length > 0 && `(${filters.species.length})`}
									<ChevronDown className='h-4 w-4' />
								</Button>
							</PopoverTrigger>
							<PopoverContent className='w-56 p-0' align='end'>
								<div className='**:data-[slot=command-group]:p-0 **:data-[slot=command-item]:pl-1 **:data-[slot=command-item]:pr-2 **:data-[slot=command-item]:cursor-pointer'>
									<VirtualizedCommand
										height='240px'
										options={speciesVirtualOptions}
										placeholder='Search species...'
										selectedOptions={filters.species}
										emptyMessage='No species found.'
										onSelectOption={(value) =>
											handleMultiSelectToggle('species', value, !filters.species.includes(value))
										}
									/>
								</div>
							</PopoverContent>
						</Popover>

						{/* Enclosures */}
						<Popover>
							<PopoverTrigger asChild>
								<Button variant='outline' className='gap-2'>
									Enclosures {filters.enclosures.length > 0 && `(${filters.enclosures.length})`}
									<ChevronDown className='h-4 w-4' />
								</Button>
							</PopoverTrigger>
							<PopoverContent className='w-56 p-0' align='end'>
								<div className='**:data-[slot=command-group]:p-0 **:data-[slot=command-item]:pl-1 **:data-[slot=command-item]:pr-2 **:data-[slot=command-item]:cursor-pointer'>
									<VirtualizedCommand
										height='240px'
										options={enclosureVirtualOptions}
										placeholder='Search enclosures...'
										selectedOptions={filters.enclosures}
										emptyMessage='No enclosures found.'
										onSelectOption={(value) =>
											handleMultiSelectToggle('enclosures', value, !filters.enclosures.includes(value))
										}
									/>
								</div>
							</PopoverContent>
						</Popover>

						{/* Users */}
						<Popover>
							<PopoverTrigger asChild>
								<Button variant='outline' className='gap-2'>
									Users {filters.users.length > 0 && `(${filters.users.length})`}
									<ChevronDown className='h-4 w-4' />
								</Button>
							</PopoverTrigger>
							<PopoverContent className='w-56 p-0' align='end'>
								<div className='**:data-[slot=command-group]:p-0 **:data-[slot=command-item]:pl-1 **:data-[slot=command-item]:pr-2 **:data-[slot=command-item]:cursor-pointer'>
									<VirtualizedCommand
										height='240px'
										options={userVirtualOptions}
										placeholder='Search users...'
										selectedOptions={filters.users}
										emptyMessage='No users found.'
										onSelectOption={(value) => handleMultiSelectToggle('users', value, !filters.users.includes(value))}
									/>
								</div>
							</PopoverContent>
						</Popover>

						{/* Task Type */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant='outline' className='gap-2'>
									Task Type {filters.taskTypes.length > 0 && `(${filters.taskTypes.length})`}
									<ChevronDown className='h-4 w-4' />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align='end' className='max-h-[300px] overflow-y-auto'>
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

						{/* Date Range */}
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
							<PopoverContent className='w-auto p-0' align='end'>
								<Calendar
									initialFocus
									mode='range'
									defaultMonth={dateRange?.from}
									selected={dateRange}
									onSelect={handleDateRangeChange}
									numberOfMonths={2}
								/>
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
				</>
			)}
		</div>
	)
}
