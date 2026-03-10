'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Calendar, ChevronDown, Repeat, Search, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleFilters {
	search: string
	activeOnly: boolean
	priorityFilter: ('low' | 'medium' | 'high')[]
	typeFilter: ('fixed_calendar' | 'relative_interval')[]
}

interface ScheduledTasksFiltersProps {
	filters: ScheduleFilters
	onChange: (filters: ScheduleFilters) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScheduledTasksFilters({ filters, onChange }: ScheduledTasksFiltersProps) {
	const { search, activeOnly, priorityFilter, typeFilter } = filters

	const set = (partial: Partial<ScheduleFilters>) => onChange({ ...filters, ...partial })

	const hasActiveFilters = activeOnly || priorityFilter.length > 0 || typeFilter.length > 0

	const resetFilters = () => onChange({ search, activeOnly: false, priorityFilter: [], typeFilter: [] })

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

			{/* Active Only */}
			<div className='flex items-center gap-2'>
				<Switch id='active-only' checked={activeOnly} onCheckedChange={(checked) => set({ activeOnly: checked })} />
				<Label htmlFor='active-only' className='cursor-pointer'>
					Active only
				</Label>
			</div>

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
							<span className='capitalize'>{p}</span>
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
