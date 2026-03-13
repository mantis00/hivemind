import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import type { RecentActivityItem } from '@/lib/react-query/queries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type RecentActivityPanelProps = {
	orgId: string
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

export function RecentActivityPanel({ orgId, items, timeZone }: RecentActivityPanelProps) {
	const visibleItems = items.slice(0, 6)

	return (
		<Card>
			<CardHeader>
				<div className='flex items-center justify-between gap-3'>
					<CardTitle>Recent Activity</CardTitle>
					<Button asChild variant='ghost' size='sm' className='h-8 px-2 text-xs'>
						<Link href={`/protected/orgs/${orgId}/tasks`}>
							Open tasks
							<ArrowRight className='h-3.5 w-3.5' />
						</Link>
					</Button>
				</div>
				<CardDescription>Tasks completed today, including overdue/high-priority completion context.</CardDescription>
			</CardHeader>
			<CardContent className='space-y-2'>
				{items.length === 0 ? (
					<p className='text-sm text-muted-foreground'>No tasks have been completed yet today.</p>
				) : (
					<div className='space-y-3'>
						{visibleItems.map((item) => (
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
						))}
					</div>
				)}
				{items.length > visibleItems.length ? (
					<p className='text-xs text-muted-foreground'>
						Showing {visibleItems.length} of {items.length} activity items from today.
					</p>
				) : null}
			</CardContent>
		</Card>
	)
}
