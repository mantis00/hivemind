import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import type { AtRiskEnclosureSummary } from '@/lib/react-query/queries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/context/format-date'

type AtRiskPanelProps = {
	orgId: string
	items: AtRiskEnclosureSummary[]
	loading?: boolean
}

function formatDueDate(value: string | null) {
	if (!value) {
		return 'No due date'
	}

	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) {
		return value
	}

	return formatDate(value)
}

export function AtRiskPanel({ orgId, items, loading = false }: AtRiskPanelProps) {
	return (
		<Card className='gap-3'>
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
				<CardDescription>Highest-risk enclosures based on overdue and high-priority tasks.</CardDescription>
			</CardHeader>
			<CardContent className='pt-0'>
				{loading ? (
					<div className='space-y-3'>
						{Array.from({ length: 3 }).map((_, index) => (
							<div key={index} className='flex min-h-20 items-start justify-between gap-3 rounded-lg border p-3'>
								<div className='min-w-0 flex-1 space-y-2'>
									<Skeleton className='h-4 w-32' />
									<Skeleton className='h-3 w-24' />
								</div>
								<div className='flex shrink-0 flex-wrap justify-end gap-1'>
									<Skeleton className='h-5 w-20 rounded-full' />
									<Skeleton className='h-5 w-24 rounded-full' />
								</div>
							</div>
						))}
					</div>
				) : items.length === 0 ? (
					<p className='text-sm text-muted-foreground'>No at-risk enclosures right now.</p>
				) : (
					<div className='space-y-2'>
						{items.map((item) => (
							<Link
								key={item.enclosureId}
								href={`/protected/orgs/${orgId}/enclosures/${item.enclosureId}`}
								className='flex min-h-20 items-start justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30'
							>
								<div className='min-w-0 flex-1'>
									<p className='truncate text-sm font-medium'>{item.enclosureName}</p>
									<p className='text-xs text-muted-foreground'>Next due: {formatDueDate(item.nextDueAt)}</p>
								</div>
								<div className='flex shrink-0 flex-wrap justify-end gap-1'>
									<Badge variant='destructive' className='whitespace-nowrap'>
										{item.overdueCount} overdue
									</Badge>
									<Badge variant='secondary' className='whitespace-nowrap'>
										{item.highPriorityCount} high priority
									</Badge>
								</div>
							</Link>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
