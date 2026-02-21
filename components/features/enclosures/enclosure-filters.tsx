'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function EnclosureFilters() {
	return (
		<div className='flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2'>
			<Select defaultValue='active'>
				<SelectTrigger className='w-44'>
					<SelectValue placeholder='Active Enclosures' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='active'>Active Enclosures</SelectItem>
					<SelectItem value='all'>All Enclosures</SelectItem>
					<SelectItem value='archived'>Archived</SelectItem>
				</SelectContent>
			</Select>

			<Select defaultValue='filter'>
				<SelectTrigger className='w-36'>
					<SelectValue placeholder='Filter' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='filter'>Filter</SelectItem>
					<SelectItem value='urgent'>Urgent</SelectItem>
					<SelectItem value='assigned'>Assigned</SelectItem>
				</SelectContent>
			</Select>

			<Select defaultValue='sort'>
				<SelectTrigger className='w-32'>
					<SelectValue placeholder='Sort' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='sort'>Sort</SelectItem>
					<SelectItem value='name'>Name</SelectItem>
					<SelectItem value='recent'>Most Recent</SelectItem>
				</SelectContent>
			</Select>

			<Select defaultValue='alerts'>
				<SelectTrigger className='w-32'>
					<SelectValue placeholder='Alerts' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='alerts'>Alerts</SelectItem>
					<SelectItem value='all'>All</SelectItem>
					<SelectItem value='critical'>Critical</SelectItem>
				</SelectContent>
			</Select>
		</div>
	)
}
