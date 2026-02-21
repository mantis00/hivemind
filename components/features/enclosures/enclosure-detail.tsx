'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { EnclosureDetail } from './types'
import { RecentEventsList } from './recent-events-list'

export function EnclosureDetail({ enclosure, className }: { enclosure: EnclosureDetail; className?: string }) {
	return (
		<div className={cn('rounded-xl border bg-muted/20 p-4 flex flex-col gap-4', className)}>
			<div className='flex flex-wrap items-start justify-between gap-4'>
				<div>
					<h2 className='text-xl font-semibold'>{enclosure.name}</h2>
					<p className='text-sm text-muted-foreground'>{enclosure.species}</p>
					{enclosure.scientificName && (
						<p className='text-xs text-muted-foreground italic'>{enclosure.scientificName}</p>
					)}
					<div className='mt-2 text-sm text-muted-foreground'>
						<span>Population: {enclosure.populationCount ?? '—'}</span>
						{typeof enclosure.adults === 'number' && typeof enclosure.nymphs === 'number' ? (
							<>
								<span className='mx-2'>•</span>
								<span>Adults: {enclosure.adults}</span>
								<span className='mx-2'>•</span>
								<span>Nymphs: {enclosure.nymphs}</span>
							</>
						) : null}
					</div>
				</div>
				<div className='flex h-28 w-28 items-center justify-center rounded-lg border bg-background text-xs text-muted-foreground'>
					species image
				</div>
			</div>

			<div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]'>
				<Card className='bg-background'>
					<CardHeader className='pb-2'>
						<CardTitle className='text-sm'>General Information</CardTitle>
					</CardHeader>
					<CardContent className='space-y-2 text-sm text-muted-foreground'>
						{enclosure.generalInfo.map((item) => (
							<div key={item.label} className='flex justify-between gap-4'>
								<span className='font-medium text-foreground'>{item.label}</span>
								<span className='text-right'>{item.value}</span>
							</div>
						))}
					</CardContent>
				</Card>

				<div className='flex flex-col gap-3'>
					<Button className='bg-sky-500 text-white hover:bg-sky-400'>Notes</Button>
					<Card className='flex-1 bg-background'>
						<CardHeader className='pb-2'>
							<CardTitle className='text-sm'>Recent Events</CardTitle>
						</CardHeader>
						<CardContent>
							<RecentEventsList events={enclosure.recentEvents} />
						</CardContent>
					</Card>
				</div>
			</div>

			<div className='flex justify-end'>
				<Button className='bg-red-500 text-white hover:bg-red-400'>Edit Enclosure</Button>
			</div>
		</div>
	)
}
