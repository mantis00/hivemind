'use client'
import { format } from 'date-fns'
import { useState } from 'react'

import { Calendar, MapPin, Users } from 'lucide-react'
import { type Enclosure, type OrgSpecies } from '@/lib/react-query/queries'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '../ui/badge'
import { Checkbox } from '../ui/checkbox'

export function EnclosureCard({
	enclosure,
	species,
	onClick,
	selectable = false,
	selected = false,
	onSelectChange
}: {
	enclosure: Enclosure
	species: OrgSpecies
	onClick: () => void
	selectable?: boolean
	selected?: boolean
	onSelectChange?: (checked: boolean) => void
}) {
	return (
		<>
			<Card
				className={`cursor-pointer transition-colors hover:bg-accent/50 border-l-4 py-2 ${
					selected ? 'border-l-primary bg-accent/30' : 'border-l-primary/20'
				}`}
				onClick={() => {
					if (selectable) {
						onSelectChange?.(!selected)
					} else {
						onClick()
					}
				}}
			>
				<CardContent className='p-2'>
					<div className='flex items-center justify-between gap-1'>
						{selectable && (
							<Checkbox
								checked={selected}
								onCheckedChange={(checked) => onSelectChange?.(!!checked)}
								onClick={(e) => e.stopPropagation()}
								className='shrink-0 m-2'
							/>
						)}
						<div className='space-y-1.5 flex-1 min-w-0'>
							<p className='font-medium text-sm truncate'>{enclosure.name}</p>
							<div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
								<MapPin className='h-3 w-3 shrink-0' />
								<span className='truncate'>{enclosure.locations?.name}</span>
							</div>
							<div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
								<Calendar className='h-3 w-3 shrink-0' />
								{enclosure.created_at && (
									<span>{format(new Date(enclosure.created_at.substring(0, 10)), 'MMM d, yyyy')}</span>
								)}
							</div>
						</div>
						<Badge variant='secondary' className='gap-1 self-center shrink-0'>
							<Users className='h-3 w-3' />
							{enclosure.current_count}
						</Badge>
					</div>
				</CardContent>
			</Card>
		</>
	)
}
