'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { getDateStr, getDayLabel } from '@/context/task-day'
import { formatDate } from '@/context/format-date'

interface DayNavigatorProps {
	dayOffset: number
	onDayChange: (offset: number) => void
	isRangeMode: boolean
	globalSearch: boolean
	dateRange: DateRange | undefined
	onClearRange: () => void
	onClearGlobalSearch: () => void
	rowCount: number
	todayCounts: { dueToday: number; late: number } | null
}

export function DayNavigator({
	dayOffset,
	onDayChange,
	isRangeMode,
	globalSearch,
	dateRange,
	onClearRange,
	onClearGlobalSearch,
	rowCount,
	todayCounts
}: DayNavigatorProps) {
	if (isRangeMode) {
		return (
			<div className='flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2'>
				<div className='flex-1' />
				<div className='text-center'>
					<p className='text-sm font-semibold'>
						{formatDate(dateRange!.from!.toISOString())} – {formatDate(dateRange!.to!.toISOString())}
					</p>
					<p className='text-xs text-muted-foreground'>Custom date range · {rowCount} tasks</p>
				</div>
				<div className='flex flex-1 justify-end'>
					<Button variant='ghost' size='sm' onClick={onClearRange} className='gap-1 text-muted-foreground'>
						<X className='h-4 w-4' />
						Clear range
					</Button>
				</div>
			</div>
		)
	}

	if (globalSearch) {
		return (
			<div className='flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2'>
				<div className='flex-1' />
				<div className='text-center'>
					<p className='text-sm font-semibold'>All dates</p>
					<p className='text-xs text-muted-foreground'>Searching across all tasks · {rowCount} results</p>
				</div>
				<div className='flex flex-1 justify-end'>
					<Button variant='ghost' size='sm' onClick={onClearGlobalSearch} className='gap-1 text-muted-foreground'>
						<X className='h-4 w-4' />
						Clear
					</Button>
				</div>
			</div>
		)
	}

	return (
		<div className='flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2'>
			<Button variant='ghost' size='sm' onClick={() => onDayChange(dayOffset - 1)} className='gap-1'>
				<ChevronLeft className='h-4 w-4' />
				{getDayLabel(dayOffset - 1)}
			</Button>
			<div className='text-center'>
				<p className='text-sm font-semibold'>{getDayLabel(dayOffset)}</p>
				<p className='text-xs text-muted-foreground'>{getDateStr(dayOffset)}</p>
				{dayOffset === 0 && todayCounts && (
					<p className='text-xs text-muted-foreground mt-0.5'>
						{todayCounts.dueToday} due today · {todayCounts.late} late
					</p>
				)}
			</div>
			<Button variant='ghost' size='sm' onClick={() => onDayChange(dayOffset + 1)} className='gap-1'>
				{getDayLabel(dayOffset + 1)}
				<ChevronRight className='h-4 w-4' />
			</Button>
		</div>
	)
}
