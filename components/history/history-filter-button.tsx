'use client'

import * as React from 'react'
import { CalendarIcon, ChevronDown, X } from 'lucide-react'
import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { VirtualizedCommand, type VirtualizedOption } from '@/components/ui/virtualized-combobox'
import { type TimelineFilters, TimelineRecordType, type EnclosureTimelineRow } from '@/lib/react-query/queries'
import { RECORD_TYPE_OPTIONS } from './history-constants'

interface HistoryFilterButtonProps {
	filters: TimelineFilters
	onFiltersChange: (filters: TimelineFilters) => void
	hasActiveFilters: boolean
	onReset: () => void
	data: EnclosureTimelineRow[]
	trigger: React.ReactNode
}

export function HistoryFilterButton({
	filters,
	onFiltersChange,
	hasActiveFilters,
	onReset,
	data,
	trigger
}: HistoryFilterButtonProps) {
	const [datePickerOpen, setDatePickerOpen] = React.useState(false)

	const dateRange: DateRange | undefined = React.useMemo(() => {
		if (filters.dateFrom && filters.dateTo) {
			return { from: new Date(filters.dateFrom), to: new Date(filters.dateTo) }
		}
		return undefined
	}, [filters.dateFrom, filters.dateTo])

	const speciesOptions = React.useMemo<VirtualizedOption[]>(() => {
		const unique = [...new Set(data.map((row) => row.species_name).filter(Boolean))] as string[]
		return unique.sort().map((s) => ({ value: s, label: s }))
	}, [data])

	const enclosureOptions = React.useMemo<VirtualizedOption[]>(() => {
		const filteredData =
			filters.species.length > 0
				? data.filter((row) => row.species_name && filters.species.includes(row.species_name))
				: data
		const unique = [...new Set(filteredData.map((row) => row.enclosure_name).filter(Boolean))] as string[]
		return unique.sort().map((e) => ({ value: e, label: e }))
	}, [data, filters.species])

	const userOptions = React.useMemo<VirtualizedOption[]>(() => {
		const unique = [...new Set(data.map((row) => row.user_name).filter(Boolean))] as string[]
		return unique.sort().map((u) => ({ value: u, label: u }))
	}, [data])

	const taskTypeOptions = React.useMemo<VirtualizedOption[]>(() => {
		const unique = [...new Set(data.map((row) => row.template_type).filter(Boolean))] as string[]
		return unique.sort().map((t) => ({ value: t, label: t }))
	}, [data])

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

	const activeCount = [
		filters.recordTypes.length > 0,
		filters.species.length > 0,
		filters.enclosures.length > 0,
		filters.users.length > 0,
		filters.taskTypes.length > 0,
		filters.dateFrom !== null
	].filter(Boolean).length

	return (
		<ResponsiveDialogDrawer
			title='Filter History'
			description='Narrow history by type, species, enclosure, user, or date.'
			trigger={trigger}
		>
			{/* Activity Type */}
			<div className='space-y-3'>
				<p className='text-sm font-medium text-muted-foreground'>
					Activity Type {filters.recordTypes.length > 0 && `(${filters.recordTypes.length})`}
				</p>
				<div className='flex gap-2'>
					{RECORD_TYPE_OPTIONS.map((opt) => (
						<button
							key={opt.value}
							type='button'
							onClick={() => handleRecordTypeToggle(opt.value, !filters.recordTypes.includes(opt.value))}
							className={`flex-1 rounded-full border py-2 text-sm transition-colors ${
								filters.recordTypes.includes(opt.value)
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-border bg-background text-foreground'
							}`}
						>
							{opt.label}
						</button>
					))}
				</div>
			</div>

			<Separator className='my-1' />

			{/* Species */}
			<div className='space-y-3'>
				<p className='text-sm font-medium text-muted-foreground'>
					Species {filters.species.length > 0 && `(${filters.species.length})`}
				</p>
				<Popover>
					<PopoverTrigger asChild>
						<Button variant='outline' className='w-full gap-2 justify-between'>
							{filters.species.length > 0 ? `${filters.species.length} selected` : 'Select species'}
							<ChevronDown className='h-4 w-4' />
						</Button>
					</PopoverTrigger>
					<PopoverContent className='w-64 p-0' align='start'>
						<div className='**:data-[slot=command-group]:p-0 **:data-[slot=command-item]:pl-3 **:data-[slot=command-item]:pr-2 **:data-[slot=command-item]:cursor-pointer'>
							<VirtualizedCommand
								height='240px'
								options={speciesOptions}
								placeholder='Search species...'
								selectedOptions={filters.species}
								emptyMessage='No species found.'
								onSelectOption={(value) => handleMultiSelectToggle('species', value, !filters.species.includes(value))}
							/>
						</div>
					</PopoverContent>
				</Popover>
			</div>

			<Separator className='my-1' />

			{/* Enclosures */}
			<div className='space-y-3'>
				<p className='text-sm font-medium text-muted-foreground'>
					Enclosures {filters.enclosures.length > 0 && `(${filters.enclosures.length})`}
				</p>
				<Popover>
					<PopoverTrigger asChild>
						<Button variant='outline' className='w-full gap-2 justify-between'>
							{filters.enclosures.length > 0 ? `${filters.enclosures.length} selected` : 'Select enclosures'}
							<ChevronDown className='h-4 w-4' />
						</Button>
					</PopoverTrigger>
					<PopoverContent className='w-64 p-0' align='start'>
						<div className='**:data-[slot=command-group]:p-0 **:data-[slot=command-item]:pl-3 **:data-[slot=command-item]:pr-2 **:data-[slot=command-item]:cursor-pointer'>
							<VirtualizedCommand
								height='240px'
								options={enclosureOptions}
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
			</div>

			<Separator className='my-1' />

			{/* Users */}
			<div className='space-y-3'>
				<p className='text-sm font-medium text-muted-foreground'>
					Users {filters.users.length > 0 && `(${filters.users.length})`}
				</p>
				<Popover>
					<PopoverTrigger asChild>
						<Button variant='outline' className='w-full gap-2 justify-between'>
							{filters.users.length > 0 ? `${filters.users.length} selected` : 'Select users'}
							<ChevronDown className='h-4 w-4' />
						</Button>
					</PopoverTrigger>
					<PopoverContent className='w-64 p-0' align='start'>
						<div className='**:data-[slot=command-group]:p-0 **:data-[slot=command-item]:pl-3 **:data-[slot=command-item]:pr-2 **:data-[slot=command-item]:cursor-pointer'>
							<VirtualizedCommand
								height='240px'
								options={userOptions}
								placeholder='Search users...'
								selectedOptions={filters.users}
								emptyMessage='No users found.'
								onSelectOption={(value) => handleMultiSelectToggle('users', value, !filters.users.includes(value))}
							/>
						</div>
					</PopoverContent>
				</Popover>
			</div>

			<Separator className='my-1' />

			{/* Task Type */}
			<div className='space-y-3'>
				<p className='text-sm font-medium text-muted-foreground'>
					Task Type {filters.taskTypes.length > 0 && `(${filters.taskTypes.length})`}
				</p>
				<Popover>
					<PopoverTrigger asChild>
						<Button variant='outline' className='w-full gap-2 justify-between'>
							{filters.taskTypes.length > 0 ? `${filters.taskTypes.length} selected` : 'Select task types'}
							<ChevronDown className='h-4 w-4' />
						</Button>
					</PopoverTrigger>
					<PopoverContent className='w-64 p-0' align='start'>
						<div className='**:data-[slot=command-group]:p-0 **:data-[slot=command-item]:pl-3 **:data-[slot=command-item]:pr-2 **:data-[slot=command-item]:cursor-pointer'>
							<VirtualizedCommand
								height='240px'
								options={taskTypeOptions}
								placeholder='Search task types...'
								selectedOptions={filters.taskTypes}
								emptyMessage='No task types found.'
								onSelectOption={(value) =>
									handleMultiSelectToggle('taskTypes', value, !filters.taskTypes.includes(value))
								}
							/>
						</div>
					</PopoverContent>
				</Popover>
			</div>

			<Separator className='my-1' />

			{/* Date Range */}
			<div className='space-y-3'>
				<p className='text-sm font-medium text-muted-foreground'>Date Range</p>
				<Popover
					open={datePickerOpen}
					onOpenChange={(open) => {
						if (!open && dateRange?.from && !dateRange?.to) {
							handleDateRangeChange({ from: dateRange.from, to: dateRange.from })
						}
						setDatePickerOpen(open)
					}}
				>
					<PopoverTrigger asChild>
						<Button variant={dateRange?.from ? 'secondary' : 'outline'} className='w-full gap-2'>
							<CalendarIcon className='h-4 w-4' />
							{dateRange?.from ? (
								dateRange.to ? (
									<>
										{format(dateRange.from, 'LLL dd')} – {format(dateRange.to, 'LLL dd')}
									</>
								) : (
									format(dateRange.from, 'LLL dd, y')
								)
							) : (
								'Select date range'
							)}
						</Button>
					</PopoverTrigger>
					<PopoverContent className='w-auto p-0' align='start'>
						<Calendar
							mode='range'
							selected={dateRange}
							onSelect={(range) => {
								handleDateRangeChange(range)
								if (range?.from && range?.to) setDatePickerOpen(false)
							}}
							numberOfMonths={1}
						/>
					</PopoverContent>
				</Popover>
				{dateRange?.from && (
					<Button
						variant='ghost'
						size='sm'
						className='h-7 gap-1 text-xs text-muted-foreground'
						onClick={() => handleDateRangeChange(undefined)}
					>
						<X className='h-3 w-3' />
						Clear date range
					</Button>
				)}
			</div>

			{hasActiveFilters && (
				<>
					<Separator className='my-1' />
					<Button variant='default' className='w-full gap-1.5' onClick={onReset}>
						<X className='h-4 w-4' />
						Clear all filters ({activeCount})
					</Button>
				</>
			)}
		</ResponsiveDialogDrawer>
	)
}
