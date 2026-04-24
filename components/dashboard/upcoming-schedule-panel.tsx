import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import type { DashboardKpis, UpcomingScheduleItem } from '@/lib/react-query/queries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { timeWindowConfig } from '@/context/task-config'
import { formatDate } from '@/context/format-date'

type UpcomingSchedulePanelProps = {
	orgId: string
	items: UpcomingScheduleItem[]
	kpis: DashboardKpis
	loading?: boolean
}

function formatDueDate(value: string | null) {
	if (!value) {
		return 'TBD'
	}

	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) {
		return value
	}

	return formatDate(value)
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

export function UpcomingSchedulePanel({ orgId, items, kpis, loading = false }: UpcomingSchedulePanelProps) {
	const highPriorityDueToday = items.filter((item) => item.priority?.toLowerCase() === 'high').length
	const previewItems = items.slice(0, 4)

	return (
		<Card>
			<CardHeader>
				<CardTitle>Today Action Center</CardTitle>
				<CardDescription>Quick summary and shortcuts for today&apos;s work.</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				{loading ? (
					<>
						<div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
							{Array.from({ length: 4 }).map((_, index) => (
								<div key={index} className='rounded-lg border bg-muted/20 p-3 space-y-2'>
									<Skeleton className='h-3 w-20' />
									<Skeleton className='h-6 w-10' />
								</div>
							))}
						</div>

						<div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
							{Array.from({ length: 4 }).map((_, index) => (
								<Skeleton key={index} className='h-10 w-full rounded-md' />
							))}
						</div>

						<div className='space-y-2'>
							<div className='flex items-center justify-between gap-3'>
								<Skeleton className='h-4 w-24' />
								<Skeleton className='h-4 w-12' />
							</div>
							<div className='space-y-2'>
								{Array.from({ length: 3 }).map((_, index) => (
									<div key={index} className='flex items-start justify-between gap-3 rounded-lg border p-3'>
										<div className='min-w-0 flex-1 space-y-2'>
											<div className='flex items-center gap-2'>
												<Skeleton className='h-4 w-32' />
												<Skeleton className='h-4 w-8 rounded-full' />
											</div>
											<Skeleton className='h-3 w-24' />
										</div>
										<div className='flex shrink-0 flex-col items-end gap-2'>
											<Skeleton className='h-5 w-24 rounded-full' />
											<Skeleton className='h-3 w-16' />
										</div>
									</div>
								))}
							</div>
						</div>
					</>
				) : (
					<>
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
												<div className='flex items-center gap-1.5'>
													<p className='truncate text-sm font-medium'>{item.taskTitle}</p>
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
												<p className='truncate text-xs text-muted-foreground'>{item.enclosureName}</p>
											</div>
											<div className='flex shrink-0 flex-col items-end gap-1'>
												<Badge variant={item.priority?.toLowerCase() === 'high' ? 'destructive' : 'outline'}>
													{item.priority?.toLowerCase() === 'high' ? 'High Priority' : (item.priority ?? 'Unspecified')}
												</Badge>
												<p className='text-xs text-muted-foreground'>Due {formatDueDate(item.dueAt)}</p>
											</div>
										</Link>
									))}
								</div>
							)}
						</div>
					</>
				)}
			</CardContent>
		</Card>
	)
}
