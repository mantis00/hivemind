'use client'

import * as React from 'react'
import { format, isToday } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerProps {
	value: Date | undefined
	onChange: (date: Date | undefined) => void
	placeholder?: string
	className?: string
	disabled?: boolean
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date', className, disabled }: DatePickerProps) {
	const handleSelect = (date: Date | undefined) => {
		if (date) {
			const now = new Date()
			date.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds())
		}
		onChange(date)
	}

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					type='button'
					variant='outline'
					className={cn('justify-start text-left font-normal', !value && 'text-muted-foreground', className)}
					disabled={disabled}
				>
					<CalendarIcon className='mr-2 h-4 w-4 shrink-0' />
					{value ? isToday(value) ? 'Today' : format(value, 'PPP') : <span>{placeholder}</span>}
				</Button>
			</PopoverTrigger>
			<PopoverContent className='w-auto p-0' align='start'>
				<Calendar mode='single' selected={value} onSelect={handleSelect} />
			</PopoverContent>
		</Popover>
	)
}
