import Link from 'next/link'

import type { RecentActivityItem } from '@/lib/dashboard/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type RecentActivityPanelProps = {
	items: RecentActivityItem[]
	timeZone: string
}

function formatDateTime(value: string, timeZone: string) {
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

function getActivityBadgeLabel(item: RecentActivityItem) {
	if (item.type === 'task_completed') {
		return 'Task Completed'
	}

	if (item.type === 'task_created') {
		return 'Task Created'
	}

	if (item.type === 'note_added') {
		return 'Note Added'
	}

	if (item.type === 'enclosure_created') {
		return 'Enclosure Created'
	}

	return 'Activity'
}

export function RecentActivityPanel({ items, timeZone }: RecentActivityPanelProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Recent Activity</CardTitle>
				<CardDescription>Most recent task, enclosure, and note events for this organization.</CardDescription>
			</CardHeader>
			<CardContent className='space-y-3'>
				{items.length === 0 ? (
					<p className='text-sm text-muted-foreground'>
						No recent activity yet. New tasks, notes, and enclosure events appear here.
					</p>
				) : (
					items.map((item) => (
						<Link
							key={item.id}
							href={item.href}
							className='flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/30'
						>
							<div className='flex items-center justify-between gap-3'>
								<p className='font-medium'>{item.label}</p>
								<Badge variant='outline'>{getActivityBadgeLabel(item)}</Badge>
							</div>
							<p className='text-sm text-muted-foreground'>{formatDateTime(item.occurredAt, timeZone)}</p>
						</Link>
					))
				)}
			</CardContent>
		</Card>
	)
}
