'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function SpeciesFilters() {
	return (
		<div className='flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2'>
			<Select defaultValue='all'>
				<SelectTrigger className='w-36'>
					<SelectValue placeholder='All Species' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='all'>All Species</SelectItem>
					<SelectItem value='featured'>Featured</SelectItem>
				</SelectContent>
			</Select>

			<Select defaultValue='difficulty'>
				<SelectTrigger className='w-32'>
					<SelectValue placeholder='Difficulty' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='difficulty'>Difficulty</SelectItem>
					<SelectItem value='easy'>Easy</SelectItem>
					<SelectItem value='medium'>Medium</SelectItem>
					<SelectItem value='hard'>Hard</SelectItem>
				</SelectContent>
			</Select>

			<Select defaultValue='grouping'>
				<SelectTrigger className='w-36'>
					<SelectValue placeholder='Group/Solitary' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='grouping'>Group/Solitary</SelectItem>
					<SelectItem value='group'>Group</SelectItem>
					<SelectItem value='solitary'>Solitary</SelectItem>
				</SelectContent>
			</Select>

			<Select defaultValue='sort'>
				<SelectTrigger className='w-28'>
					<SelectValue placeholder='Sort' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='sort'>Sort</SelectItem>
					<SelectItem value='name'>Name</SelectItem>
					<SelectItem value='difficulty'>Difficulty</SelectItem>
				</SelectContent>
			</Select>
		</div>
	)
}
