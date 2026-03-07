'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Calendar, ChevronDown, Repeat, Search, X } from 'lucide-react'
import getPriorityLevelStatus from '@/context/priority-levels'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleFilters {
	search: string
	statusFilter: ('active' | 'inactive')[]
	typeFilter: ('fixed_calendar' | 'relative_interval')[]
	priorityFilter: string[]
}

interface ScheduledTasksFiltersProps {
	filters: ScheduleFilters
	onChange: (filters: ScheduleFilters) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScheduledTasksFilters({ filters, onChange }: ScheduledTasksFiltersProps) {
	const { search, statusFilter, typeFilter, priorityFilter } = filters

	const set = (partial: Partial<ScheduleFilters>) => onChange({ ...filters, ...partial })

	const hasActiveFilters = statusFilter.length > 0 || typeFilter.length > 0 || priorityFilter.length > 0

	const resetFilters = () => onChange({ search, statusFilter: [], typeFilter: [], priorityFilter: [] })

	return (
		<div className='flex flex-wrap items-center gap-2'>
			{/* Search */}
			<div className='relative flex-1 min-w-48 max-w-sm'>
				<Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
				<Input
					placeholder='Search task, enclosure, or species…'
					className='pl-8'
					value={search}
					onChange={(e) => set({ search: e.target.value })}
				/>
			</div>

			{/* Status */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant='outline' className='gap-2'>
						Status {statusFilter.length > 0 && `(${statusFilter.length})`}
						<ChevronDown className='h-4 w-4' />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='end'>
					{(['active', 'inactive'] as const).map((s) => (
						<DropdownMenuCheckboxItem
							key={s}
							checked={statusFilter.includes(s)}
							onSelect={(e) => e.preventDefault()}
							onCheckedChange={(checked) =>
								set({
									statusFilter: checked ? [...statusFilter, s] : statusFilter.filter((x) => x !== s)
								})
							}
						>
							<span className='capitalize'>{s}</span>
						</DropdownMenuCheckboxItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Schedule type */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant='outline' className='gap-2'>
						Type {typeFilter.length > 0 && `(${typeFilter.length})`}
						<ChevronDown className='h-4 w-4' />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='end'>
					<DropdownMenuCheckboxItem
						checked={typeFilter.includes('fixed_calendar')}
						onSelect={(e) => e.preventDefault()}
						onCheckedChange={(checked) =>
							set({
								typeFilter: checked
									? [...typeFilter, 'fixed_calendar']
									: typeFilter.filter((x) => x !== 'fixed_calendar')
							})
						}
					>
						<Calendar className='h-3.5 w-3.5 mr-1.5 inline' />
						Fixed Weekly
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						checked={typeFilter.includes('relative_interval')}
						onSelect={(e) => e.preventDefault()}
						onCheckedChange={(checked) =>
							set({
								typeFilter: checked
									? [...typeFilter, 'relative_interval']
									: typeFilter.filter((x) => x !== 'relative_interval')
							})
						}
					>
						<Repeat className='h-3.5 w-3.5 mr-1.5 inline' />
						Flexible Interval
					</DropdownMenuCheckboxItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Priority */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant='outline' className='gap-2'>
						Priority {priorityFilter.length > 0 && `(${priorityFilter.length})`}
						<ChevronDown className='h-4 w-4' />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='end'>
					{(['low', 'medium', 'high'] as const).map((p) => (
						<DropdownMenuCheckboxItem
							key={p}
							checked={priorityFilter.includes(p)}
							onSelect={(e) => e.preventDefault()}
							onCheckedChange={(checked) =>
								set({
									priorityFilter: checked ? [...priorityFilter, p] : priorityFilter.filter((x) => x !== p)
								})
							}
						>
							{getPriorityLevelStatus(p)}
						</DropdownMenuCheckboxItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Reset */}
			{hasActiveFilters && (
				<Button variant='ghost' onClick={resetFilters} className='gap-1.5 text-muted-foreground hover:text-foreground'>
					Reset
					<X className='h-4 w-4' />
				</Button>
			)}
		</div>
	)
}
