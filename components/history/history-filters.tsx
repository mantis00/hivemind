'use client'

import { type TimelineFilters, TimelineRecordType, type EnclosureTimelineRow } from '@/lib/react-query/queries'
import * as React from 'react'
import { ChevronDown, Download, Search, X, CalendarIcon } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { RECORD_TYPE_OPTIONS } from './history-constants'

type HistoryFiltersProps = {
	filters: TimelineFilters
	onFiltersChange: (filters: TimelineFilters) => void
	hasActiveFilters: boolean
	onReset: () => void
	onExport: () => void
	data: EnclosureTimelineRow[]
}

export function HistoryFilters({
	filters,
	onFiltersChange,
	hasActiveFilters,
	onReset,
	onExport,
	data
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
			{/* Search */}
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
				{/* Type */}
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

				{/* Species */}
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

				{/* Enclosures */}
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

				{/* Users */}
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

				{/* Task Type */}
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
