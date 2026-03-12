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
	return (
		<Card>
			<CardHeader>
				<CardTitle>Tasks Due Today</CardTitle>
				<CardDescription>Open tasks due today for this organization.</CardDescription>
			</CardHeader>
			<CardContent>
				{items.length === 0 ? (
					<p className='text-sm text-muted-foreground'>No open tasks due today.</p>
				) : (
					<div className='max-h-[30rem] space-y-3 overflow-y-auto pr-1'>
						{items.map((item) => (
							<Link
								key={item.taskId}
								href={`/protected/orgs/${orgId}/enclosures/${item.enclosureId}`}
								className='flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/30'
							>
								<div className='flex items-center justify-between gap-3'>
									<p className='font-medium'>{item.taskTitle}</p>
									<Badge variant={item.priority?.toLowerCase() === 'high' ? 'destructive' : 'outline'}>
										{item.priority?.toLowerCase() === 'high' ? 'Urgent' : (item.priority ?? 'Unspecified')}
									</Badge>
								</div>
								<p className='text-sm text-muted-foreground'>Enclosure: {item.enclosureName}</p>
								<p className='text-sm text-muted-foreground'>Due: {formatDateTime(item.dueAt, timeZone)}</p>
							</Link>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
