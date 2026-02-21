'use client'

import type { EnclosureEvent } from './types'

export function RecentEventsList({ events }: { events: EnclosureEvent[] }) {
	if (!events.length) {
		return <p className='text-sm text-muted-foreground'>No recent events.</p>
	}

	return (
		<div className='space-y-2 text-sm'>
			{events.map((event) => (
				<div key={event.id} className='rounded-md border bg-background px-3 py-2'>
					<div className='text-xs text-muted-foreground'>{event.timestamp}</div>
					<div className='font-medium'>{event.caretaker}</div>
					<div>{event.description}</div>
				</div>
			))}
		</div>
	)
}
