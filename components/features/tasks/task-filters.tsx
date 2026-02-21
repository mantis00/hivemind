'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function TaskFilters() {
	return (
		<div className='flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2'>
			<Select defaultValue='all'>
				<SelectTrigger className='w-36'>
					<SelectValue placeholder='All Tasks' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='all'>All Tasks</SelectItem>
					<SelectItem value='today'>Due Today</SelectItem>
					<SelectItem value='urgent'>Urgent</SelectItem>
				</SelectContent>
			</Select>

			<Select defaultValue='any-caretaker'>
				<SelectTrigger className='w-36'>
					<SelectValue placeholder='Caretaker' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='any-caretaker'>Caretaker: Any</SelectItem>
					<SelectItem value='assigned'>Assigned to me</SelectItem>
				</SelectContent>
			</Select>

			<Select defaultValue='any-enclosure'>
				<SelectTrigger className='w-40'>
					<SelectValue placeholder='Enclosure' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='any-enclosure'>Enclosure: Any</SelectItem>
					<SelectItem value='tank-7'>Tank 7</SelectItem>
					<SelectItem value='tank-12'>Tank 12</SelectItem>
				</SelectContent>
			</Select>

			<Select defaultValue='all-status'>
				<SelectTrigger className='w-32'>
					<SelectValue placeholder='Status' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='all-status'>Status: All</SelectItem>
					<SelectItem value='todo'>To-Do</SelectItem>
					<SelectItem value='in-progress'>In Progress</SelectItem>
					<SelectItem value='completed'>Completed</SelectItem>
				</SelectContent>
			</Select>

			<Select defaultValue='sort'>
				<SelectTrigger className='w-28'>
					<SelectValue placeholder='Sort' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='sort'>Sort</SelectItem>
					<SelectItem value='priority'>Priority</SelectItem>
					<SelectItem value='due'>Due Date</SelectItem>
				</SelectContent>
			</Select>
		</div>
	)
}
