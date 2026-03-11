'use client'

import { CalendarIcon, ChevronDown, X } from 'lucide-react'
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
import {
	Combobox,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList
} from '../ui/combobox'
import { useOrgSpecies } from '@/lib/react-query/queries'
import { useMemo, useState } from 'react'

export interface TaskFilters {
	globalFilter: string
	globalSearch: boolean
	priorityFilter: string[]
	statusFilter: string[]
	dateRange: DateRange | undefined
	speciesFilter: string
}

interface TasksFiltersProps {
	enclosureId?: UUID
	orgId: UUID
	filters: TaskFilters
	onFiltersChange: (filters: TaskFilters) => void
	hasActiveFilters: boolean
	onReset: () => void
	showSpeciesFilter?: boolean
}

export function TasksFilters({
	enclosureId,
	orgId,
	filters,
	onFiltersChange,
	hasActiveFilters,
	onReset,
	showSpeciesFilter
}: TasksFiltersProps) {
	const isMobile = useIsMobile()
	const { globalFilter, globalSearch, priorityFilter, statusFilter, dateRange } = filters
	const isRangeMode = !!(dateRange?.from && dateRange?.to)

	const { data: orgSpecies, isPending: isPending } = useOrgSpecies(orgId as UUID)
	const [speciesQuery, setSpeciesQuery] = useState(filters.speciesFilter ?? '')
	const [showScientific] = useState(false)

	const scoreMatch = (str: string | undefined, val: string): number => {
		if (!str) return -1
		const s = str.trim().toLowerCase()
		if (s === val) return 0
		if (s.startsWith(val)) return 1
		if (s.includes(val)) return 2
		return -1
	}

	const filteredSpecies = useMemo(() => {
		if (!speciesQuery.trim()) return orgSpecies ?? []
		const val = speciesQuery.trim().toLowerCase()
		return (orgSpecies ?? [])
			.map((s) => {
				const field = showScientific ? s.species?.scientific_name : s.custom_common_name
				return { s, score: scoreMatch(field, val) }
			})
			.filter(({ score }) => score >= 0)
			.sort((a, b) => a.score - b.score)
			.map(({ s }) => s)
	}, [speciesQuery, orgSpecies, showScientific])

	return (
		<div className='flex flex-col gap-3 md:flex-row md:items-center md:flex-wrap'>
			{isMobile && enclosureId && <CreateTaskButton enclosureId={enclosureId} orgId={orgId} />}

			<div className='flex items-center gap-2'>
				<Input
					placeholder='Search tasks...'
					value={globalFilter}
					onChange={(e) => onFiltersChange({ ...filters, globalFilter: e.target.value })}
					className='w-48'
				/>
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
				{showSpeciesFilter && (
					<Combobox
						items={filteredSpecies}
						filter={() => true}
						value={filters.speciesFilter}
						onValueChange={(value) => {
							onFiltersChange({ ...filters, speciesFilter: value ?? '' })
							setSpeciesQuery(value ?? '')
						}}
					>
						<ComboboxInput
							className='h-9'
							placeholder='Filter by species...'
							value={speciesQuery}
							onChange={(event) => setSpeciesQuery(event.target.value)}
							disabled={isPending}
							showClear
						/>
						<ComboboxContent>
							<ComboboxEmpty>No matching species.</ComboboxEmpty>
							<ComboboxList className='max-h-42 scrollbar-no-track'>
								<ComboboxCollection>
									{(spec) => (
										<ComboboxItem key={spec.id} value={spec.custom_common_name}>
											{spec.custom_common_name}
										</ComboboxItem>
									)}
								</ComboboxCollection>
							</ComboboxList>
						</ComboboxContent>
					</Combobox>
				)}
				<Button
					variant='ghost'
					onClick={onReset}
					className={`gap-1.5 text-muted-foreground hover:text-foreground ${hasActiveFilters ? '' : 'invisible pointer-events-none'}`}
				>
					{isMobile ? '' : 'Reset'}
					<X className='h-4 w-4' />
				</Button>

				{!isMobile && enclosureId && (
					<div className='ml-auto'>
						<CreateTaskButton enclosureId={enclosureId} orgId={orgId} />
					</div>
				)}
			</div>
		</div>
	)
}
