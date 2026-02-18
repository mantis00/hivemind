'use client'
import { format } from 'date-fns'

import { Calendar, MapPin, Users } from 'lucide-react'
import { type Enclosure } from '@/lib/react-query/queries'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '../ui/badge'

// const urgencyRing: Record<NonNullable<any['urgency']>, string> = {
// 	low: 'border-sky-400',
// 	med: 'border-amber-400',
// 	high: 'border-orange-500',
// 	critical: 'border-red-500'
// }

export function EnclosureCard({ enclosure, onClick }: { enclosure: Enclosure; onClick: () => void }) {
	// const ringClass = enclosure.urgency ? urgencyRing[enclosure.urgency] : 'border-sky-400'

	return (
		<>
			<Card
				className='cursor-pointer transition-colors hover:bg-accent/50 border-l-4 border-l-primary/20'
				onClick={onClick}
			>
				<CardContent className='p-4'>
					<div className='flex items-start justify-between gap-3'>
						<div className='space-y-1.5 min-w-0 flex-1'>
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
						<Badge variant='secondary' className='shrink-0 gap-1'>
							<Users className='h-3 w-3' />
							{enclosure.current_count}
						</Badge>
					</div>
				</CardContent>
			</Card>
		</>
	)
}
