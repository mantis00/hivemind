import Link from 'next/link'

import type { UpcomingScheduleItem } from '@/lib/dashboard/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type UpcomingSchedulePanelProps = {
	orgId: string
	items: UpcomingScheduleItem[]
	timeZone: string
}

function formatDateTime(value: string | null, timeZone: string) {
	if (!value) {
		return 'TBD'
	}

	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) {
		return value
	}

	return new Intl.DateTimeFormat('en-US', {
		timeZone,
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(parsed)
}

export function UpcomingSchedulePanel({ orgId, items, timeZone }: UpcomingSchedulePanelProps) {
	// TODO: repurpose this panel to display the Kanban board's "To Do" section instead of recurring schedule rows.
	return (
		<Card>
			<CardHeader>
				<CardTitle>Upcoming Schedule</CardTitle>
				<CardDescription>
					Active recurring schedules across the organization. Currently using last-run timestamps until next-run support
					is added.
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-3'>
				{items.length === 0 ? (
					<p className='text-sm text-muted-foreground'>
						No schedule data available yet. Once schedule rows exist, they will appear here. A future update will add
						true next-run scheduling.
					</p>
				) : (
					items.map((item) => (
						<Link
							key={item.scheduleId}
							href={`/protected/orgs/${orgId}/enclosures/${item.enclosureId}`}
							className='flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/30'
						>
							<div className='flex items-center justify-between gap-3'>
								<p className='font-medium'>{item.enclosureName}</p>
								<Badge variant='outline'>{item.scheduleType}</Badge>
							</div>
							<p className='text-sm text-muted-foreground'>Last run: {formatDateTime(item.lastRunAt, timeZone)}</p>
							{item.timeWindow ? <p className='text-xs text-muted-foreground'>Window: {item.timeWindow}</p> : null}
						</Link>
					))
				)}
			</CardContent>
		</Card>
	)
}
