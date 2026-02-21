'use client'

import type { ActivityItem } from './types'

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
	return (
		<div className='flex gap-3 overflow-x-auto pb-2'>
			{items.map((item) => (
				<div
					key={item.id}
					className='min-w-[120px] rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground'
				>
					<div>{item.timestamp}</div>
					<div>{item.name}</div>
					<div>{item.event}</div>
				</div>
			))}
		</div>
	)
}
