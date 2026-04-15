import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import type { RecentActivityItem } from '@/lib/react-query/queries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { timeWindowConfig } from '@/context/task-config'
import { formatDate } from '@/context/format-date'

type RecentActivityPanelProps = {
	orgId: string
	items: RecentActivityItem[]
}

function getDueDateLabel(item: RecentActivityItem) {
	if (!item.dueAt) {
		return 'No due date'
	}
	const value = item.dueAt
	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) {
		return `Due ${value}`
	}
	return `Due ${formatDate(value)}`
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

export function RecentActivityPanel({ orgId, items }: RecentActivityPanelProps) {
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
									<div className='flex items-center gap-1.5 min-w-0'>
										<p className='font-medium truncate'>{item.label}</p>
										{item.timeWindow ? (
											<span
												className={`shrink-0 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none ${
													(timeWindowConfig[item.timeWindow] ?? timeWindowConfig['Any']).color
												}`}
											>
												{(timeWindowConfig[item.timeWindow] ?? timeWindowConfig['Any']).shortLabel}
											</span>
										) : null}
									</div>
									<Badge variant='outline'>{getActivityBadgeLabel(item)}</Badge>
								</div>
								<p className='text-sm text-muted-foreground'>{getDueDateLabel(item)}</p>
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
