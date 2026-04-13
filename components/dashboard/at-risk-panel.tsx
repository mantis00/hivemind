import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import type { AtRiskEnclosureSummary } from '@/lib/react-query/queries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type AtRiskPanelProps = {
	orgId: string
	items: AtRiskEnclosureSummary[]
	timeZone: string
}

function formatDateTime(value: string | null, timeZone: string) {
	if (!value) {
		return 'No due date'
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

export function AtRiskPanel({ orgId, items, timeZone }: AtRiskPanelProps) {
	return (
		<Card>
			<CardHeader>
				<div className='flex items-center justify-between gap-3'>
					<CardTitle>At-Risk Enclosures</CardTitle>
					<Button asChild variant='ghost' size='sm' className='h-8 px-2 text-xs'>
						<Link href={`/protected/orgs/${orgId}/enclosures`}>
							All enclosures
							<ArrowRight className='h-3.5 w-3.5' />
						</Link>
					</Button>
				</div>
				<CardDescription>Highest-risk enclosures based on overdue and high-priority open tasks.</CardDescription>
			</CardHeader>
			<CardContent>
				{items.length === 0 ? (
					<p className='text-sm text-muted-foreground'>No at-risk enclosures right now.</p>
				) : (
					<div className='space-y-3'>
						{items.map((item) => (
							<Link
								key={item.enclosureId}
								href={`/protected/orgs/${orgId}/enclosures/${item.enclosureId}`}
								className='flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/30'
							>
								<div className='flex items-center justify-between gap-3'>
									<p className='font-medium'>{item.enclosureName}</p>
									<div className='flex items-center gap-2'>
										<Badge variant='destructive'>{item.overdueCount} overdue</Badge>
										<Badge variant='secondary'>{item.highPriorityCount} high priority</Badge>
									</div>
								</div>
								<p className='text-sm text-muted-foreground'>
									Next due: {formatDateTime(item.nextDueAt, timeZone)} ({timeZone})
								</p>
							</Link>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
