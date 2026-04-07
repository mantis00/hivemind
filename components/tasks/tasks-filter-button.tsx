'use client'

import { CalendarIcon, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import capitalizeFirstLetter from '@/context/captalize-first-letter'
import { statusConfig } from '@/context/task-config'
import { formatDate } from '@/context/format-date'
import type { TaskFilters } from './tasks-filters'

interface TasksFilterButtonProps {
	filters: TaskFilters
	onFiltersChange: (filters: TaskFilters) => void
	hasActiveFilters: boolean
	onReset: () => void
	trigger: React.ReactNode
}

export function TasksFilterButton({
	filters,
	onFiltersChange,
	hasActiveFilters,
	onReset,
	trigger
}: TasksFilterButtonProps) {
	const { priorityFilter, statusFilter, dateRange } = filters
	const isRangeMode = !!(dateRange?.from && dateRange?.to)
	const [datePickerOpen, setDatePickerOpen] = useState(false)

	const togglePriority = (p: string) =>
		onFiltersChange({
			...filters,
			priorityFilter: priorityFilter.includes(p) ? priorityFilter.filter((x) => x !== p) : [...priorityFilter, p]
		})

	const toggleStatus = (s: string) =>
		onFiltersChange({
			...filters,
			statusFilter: statusFilter.includes(s) ? statusFilter.filter((x) => x !== s) : [...statusFilter, s]
		})

	return (
		<ResponsiveDialogDrawer
			title='Filter Tasks'
			description='Narrow tasks by priority, status, or date range.'
			trigger={trigger}
		>
			{/* Priority */}
			<div className='space-y-3'>
				<p className='text-sm font-medium text-muted-foreground'>Priority</p>
				<div className='flex gap-2'>
					{(['low', 'medium', 'high'] as const).map((p) => (
						<button
							key={p}
							type='button'
							onClick={() => togglePriority(p)}
							className={`flex-1 rounded-full border py-2 text-sm transition-colors ${
								priorityFilter.includes(p)
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-border bg-background text-foreground'
							}`}
						>
							{capitalizeFirstLetter(p)}
						</button>
					))}
				</div>
			</div>

			<Separator className='my-1' />

			{/* Status */}
			<div className='space-y-3'>
				<p className='text-sm font-medium text-muted-foreground'>Status</p>
				<div className='flex gap-2'>
					{(['pending', 'late', 'completed'] as const).map((s) => (
						<button
							key={s}
							type='button'
							onClick={() => toggleStatus(s)}
							className={`flex-1 rounded-full border py-2 text-sm transition-colors ${
								statusFilter.includes(s)
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-border bg-background text-foreground'
							}`}
						>
							{statusConfig[s].label}
						</button>
					))}
				</div>
			</div>

			<Separator className='my-1' />

			{/* Date range */}
			<div className='space-y-3'>
				<p className='text-sm font-medium text-muted-foreground'>Date Range</p>
				<Popover
					open={datePickerOpen}
					onOpenChange={(open) => {
						if (!open && dateRange?.from && !dateRange?.to) {
							onFiltersChange({
								...filters,
								dateRange: { from: dateRange.from, to: dateRange.from },
								globalSearch: false
							})
						}
						setDatePickerOpen(open)
					}}
				>
					<PopoverTrigger asChild>
						<Button variant={isRangeMode ? 'secondary' : 'outline'} className='w-full gap-2'>
							<CalendarIcon className='h-4 w-4' />
							{isRangeMode
								? `${formatDate(dateRange!.from!.toISOString(), false)} – ${formatDate(dateRange!.to!.toISOString())}`
								: 'Select date range'}
						</Button>
					</PopoverTrigger>
					<PopoverContent className='w-auto p-0' align='start'>
						<Calendar
							mode='range'
							selected={dateRange}
							onSelect={(range) => {
								onFiltersChange({ ...filters, dateRange: range, globalSearch: false })
								if (range?.from && range?.to) setDatePickerOpen(false)
							}}
							numberOfMonths={1}
						/>
					</PopoverContent>
				</Popover>
				{isRangeMode && (
					<Button
						variant='ghost'
						size='sm'
						className='h-7 gap-1 text-xs text-muted-foreground'
						onClick={() => onFiltersChange({ ...filters, dateRange: undefined })}
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
						Clear all filters
					</Button>
				</>
			)}
		</ResponsiveDialogDrawer>
	)
}
