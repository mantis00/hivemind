import type { DashboardKpis } from '@/lib/react-query/queries'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type KpiStripProps = {
	kpis: DashboardKpis
	completedToday: number
	atRiskEnclosures: number
	loading?: boolean
}

export function KpiStrip({ kpis, completedToday, atRiskEnclosures, loading = false }: KpiStripProps) {
	const kpiItems = [
		{
			key: 'active-enclosures',
			label: 'Active Enclosures',
			helperText: 'Currently tracked in this org',
			value: kpis.activeEnclosures
		},
		{
			key: 'completed-today',
			label: 'Completed Today',
			helperText: 'Tasks finished today',
			value: completedToday
		},
		{
			key: 'at-risk-enclosures',
			label: 'At-Risk Enclosures',
			helperText: 'Enclosures with overdue or high-priority work',
			value: atRiskEnclosures
		},
		{
			key: 'attention-needed',
			label: 'Attention Needed',
			helperText: 'Overdue or high-priority tasks requiring triage',
			value: kpis.alerts
		}
	]

	return (
		<section className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
			{kpiItems.map((item) => (
				<Card key={item.key} className='py-3 sm:py-4'>
					<CardHeader className='pb-0'>
						{loading ? (
							<div className='space-y-2'>
								<Skeleton className='h-4 w-28' />
								<Skeleton className='h-8 w-20 sm:h-9' />
							</div>
						) : (
							<>
								<CardDescription>{item.label}</CardDescription>
								<CardTitle className='text-2xl tabular-nums sm:text-3xl'>{item.value}</CardTitle>
							</>
						)}
					</CardHeader>
					<CardContent className='text-sm text-muted-foreground'>
						{loading ? <Skeleton className='h-4 w-40 max-w-full' /> : item.helperText}
					</CardContent>
				</Card>
			))}
		</section>
	)
}
