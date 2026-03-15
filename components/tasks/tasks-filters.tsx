'use client'

import { CalendarIcon, ChevronDown, Search, X } from 'lucide-react'
import { UUID } from 'crypto'
import type { DateRange } from 'react-day-picker'

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
import { GlobalSearchToggle } from './global-search-toggle'
import { CreateTaskButton } from './create-task-button'
import capitalizeFirstLetter from '@/context/captalize-first-letter'
import { statusConfig } from '@/context/task-status'
import { formatDate } from '@/context/format-date'
import { useIsMobile } from '@/hooks/use-mobile'

export interface TaskFilters {
	globalFilter: string
	globalSearch: boolean
	priorityFilter: string[]
	statusFilter: string[]
	dateRange: DateRange | undefined
}

interface TasksFiltersProps {
	enclosureId?: UUID
	orgId: UUID
	filters: TaskFilters
	onFiltersChange: (filters: TaskFilters) => void
	hasActiveFilters: boolean
	onReset: () => void
	includeSpeciesSearch?: boolean
	includeEnclosureAndAssigneeSearch?: boolean
}

export function TasksFilters({
	enclosureId,
	orgId,
	filters,
	onFiltersChange,
	hasActiveFilters,
	onReset,
	includeSpeciesSearch = false,
	includeEnclosureAndAssigneeSearch = false
}: TasksFiltersProps) {
	const isMobile = useIsMobile()
	const { globalFilter, globalSearch, priorityFilter, statusFilter, dateRange } = filters
	const isRangeMode = !!(dateRange?.from && dateRange?.to)
	const searchPlaceholder = includeEnclosureAndAssigneeSearch
		? 'Search tasks, species, enclosures, or assignees...'
		: includeSpeciesSearch
			? 'Search tasks or species...'
			: 'Search tasks...'

	return (
		<>
			<div className='flex flex-col gap-3 md:flex-row md:items-center md:flex-wrap'>
				<div className='flex items-center gap-2'>
					<div className='relative flex-1 min-w-48 max-w-sm'>
						<Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
						<Input
							placeholder={searchPlaceholder}
							value={globalFilter}
							onChange={(e) => onFiltersChange({ ...filters, globalFilter: e.target.value })}
							className='pl-8'
						/>
					</div>
					<GlobalSearchToggle
						globalSearch={globalSearch}
						onGlobalSearchChange={(val) =>
							onFiltersChange({ ...filters, globalSearch: val, ...(val ? { dateRange: undefined } : {}) })
						}
					/>
				</div>

				<div className='flex flex-wrap items-center gap-2 flex-1'>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant='outline' className='gap-2'>
								Priority {priorityFilter.length > 0 && `(${priorityFilter.length})`}
								<ChevronDown className='h-4 w-4' />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align='end'>
							{(['low', 'medium', 'high'] as const).map((priority) => (
								<DropdownMenuCheckboxItem
									key={priority}
									checked={priorityFilter.includes(priority)}
									onSelect={(e) => e.preventDefault()}
									onCheckedChange={(checked) =>
										onFiltersChange({
											...filters,
											priorityFilter: checked
												? [...priorityFilter, priority]
												: priorityFilter.filter((p) => p !== priority)
										})
									}
								>
									{capitalizeFirstLetter(priority)}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant='outline' className='gap-2'>
								Status {statusFilter.length > 0 && `(${statusFilter.length})`}
								<ChevronDown className='h-4 w-4' />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align='end'>
							{(['pending', 'late', 'completed'] as const).map((status) => (
								<DropdownMenuCheckboxItem
									key={status}
									checked={statusFilter.includes(status)}
									onSelect={(e) => e.preventDefault()}
									onCheckedChange={(checked) =>
										onFiltersChange({
											...filters,
											statusFilter: checked ? [...statusFilter, status] : statusFilter.filter((s) => s !== status)
										})
									}
								>
									{statusConfig[status].label}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
					<Popover>
						<PopoverTrigger asChild>
							<Button variant={isRangeMode ? 'secondary' : 'outline'} className='gap-2'>
								<CalendarIcon className='h-4 w-4' />
								{isRangeMode
									? `${formatDate(dateRange!.from!.toISOString(), false)} – ${formatDate(dateRange!.to!.toISOString())}`
									: 'Date range'}
							</Button>
						</PopoverTrigger>
						<PopoverContent className='w-auto p-0' align='start'>
							<Calendar
								mode='range'
								selected={dateRange}
								onSelect={(range) =>
									onFiltersChange({
										...filters,
										dateRange: range,
										...(range?.from && range?.to ? { globalSearch: true } : {})
									})
								}
								numberOfMonths={isMobile ? 1 : 2}
							/>
						</PopoverContent>
					</Popover>
					<Button
						variant='ghost'
						onClick={onReset}
						className={`gap-1.5 text-muted-foreground hover:text-foreground ${hasActiveFilters ? '' : 'invisible pointer-events-none'}`}
					>
						{isMobile ? '' : 'Reset'}
						<X className='h-4 w-4' />
					</Button>
				</div>
			</div>
			{enclosureId && (
				<div className='w-full [&_button]:w-full'>
					<CreateTaskButton enclosureId={enclosureId} orgId={orgId} />
				</div>
			)}
		</>
	)
}
