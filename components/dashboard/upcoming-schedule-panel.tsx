import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import type { DashboardKpis, UpcomingScheduleItem } from '@/lib/react-query/queries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type UpcomingSchedulePanelProps = {
	orgId: string
	items: UpcomingScheduleItem[]
	kpis: DashboardKpis
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

type StatItemProps = {
	label: string
	value: number
}

function StatItem({ label, value }: StatItemProps) {
	return (
		<div className='rounded-lg border bg-muted/20 p-3'>
			<p className='text-xs text-muted-foreground'>{label}</p>
			<p className='text-xl font-semibold tabular-nums'>{value}</p>
		</div>
	)
}

export function UpcomingSchedulePanel({ orgId, items, kpis, timeZone }: UpcomingSchedulePanelProps) {
	const highPriorityDueToday = items.filter((item) => item.priority?.toLowerCase() === 'high').length
	const previewItems = items.slice(0, 4)

	return (
		<Card>
			<CardHeader>
				<CardTitle>Today Action Center</CardTitle>
				<CardDescription>Quick summary and shortcuts for today&apos;s work.</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				<div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
					<StatItem label='Due Today' value={kpis.tasksDueToday} />
					<StatItem label='High Priority Today' value={highPriorityDueToday} />
					<StatItem label='Next 7 Days' value={kpis.upcomingTasks} />
					<StatItem label='Alerts' value={kpis.alerts} />
				</div>

				<div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
					<Button asChild className='justify-between'>
						<Link href={`/protected/orgs/${orgId}/tasks`}>
							Open Task Board
							<ArrowRight className='h-4 w-4' />
						</Link>
					</Button>
					<Button asChild variant='outline' className='justify-between'>
						<Link href={`/protected/orgs/${orgId}/schedules`}>
							Manage Schedules
							<ArrowRight className='h-4 w-4' />
						</Link>
					</Button>
					<Button asChild variant='outline' className='justify-between'>
						<Link href={`/protected/orgs/${orgId}/enclosures`}>
							View Enclosures
							<ArrowRight className='h-4 w-4' />
						</Link>
					</Button>
					<Button asChild variant='outline' className='justify-between'>
						<Link href={`/protected/orgs/${orgId}/inbox`}>
							Open Inbox
							<ArrowRight className='h-4 w-4' />
						</Link>
					</Button>
				</div>

				<div className='space-y-2'>
					<div className='flex items-center justify-between gap-3'>
						<p className='text-sm font-medium'>Next Up Today</p>
						<Link
							href={`/protected/orgs/${orgId}/tasks`}
							className='text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline'
						>
							View all
						</Link>
					</div>
					{previewItems.length === 0 ? (
						<p className='text-sm text-muted-foreground'>No open tasks due today.</p>
					) : (
						<div className='space-y-2'>
							{previewItems.map((item) => (
								<Link
									key={item.taskId}
									href={`/protected/orgs/${orgId}/enclosures/${item.enclosureId}`}
									className='flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30'
								>
									<div className='min-w-0'>
										<p className='truncate text-sm font-medium'>{item.taskTitle}</p>
										<p className='truncate text-xs text-muted-foreground'>{item.enclosureName}</p>
									</div>
									<div className='flex shrink-0 flex-col items-end gap-1'>
										<Badge variant={item.priority?.toLowerCase() === 'high' ? 'destructive' : 'outline'}>
											{item.priority?.toLowerCase() === 'high' ? 'High Priority' : (item.priority ?? 'Unspecified')}
										</Badge>
										<p className='text-xs text-muted-foreground'>{formatDateTime(item.dueAt, timeZone)}</p>
									</div>
								</Link>
							))}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
