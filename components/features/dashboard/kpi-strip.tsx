import type { DashboardKpis } from '@/lib/react-query/queries'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type KpiStripProps = {
	kpis: DashboardKpis
}

const KPI_ITEMS: Array<{ key: keyof DashboardKpis; label: string; helperText: string }> = [
	{
		key: 'activeEnclosures',
		label: 'Active Enclosures',
		helperText: 'Currently tracked in this org'
	},
	{
		key: 'tasksDueToday',
		label: 'Tasks Due Today',
		helperText: 'Open items due before midnight'
	},
	{
		key: 'upcomingTasks',
		label: 'Upcoming Tasks',
		helperText: 'Open items due in the next 7 days'
	},
	{
		key: 'alerts',
		label: 'Alerts',
		helperText: 'Overdue or high-priority due soon'
	}
]

export function KpiStrip({ kpis }: KpiStripProps) {
	return (
		<section className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
			{KPI_ITEMS.map((item) => (
				<Card key={item.key} className='py-4'>
					<CardHeader className='pb-0'>
						<CardDescription>{item.label}</CardDescription>
						<CardTitle className='text-3xl tabular-nums'>{kpis[item.key]}</CardTitle>
					</CardHeader>
					<CardContent className='text-sm text-muted-foreground'>{item.helperText}</CardContent>
				</Card>
			))}
		</section>
	)
}
