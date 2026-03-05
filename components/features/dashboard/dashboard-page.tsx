import type { DashboardData } from '@/lib/dashboard/types'
import { KpiStrip } from '@/components/features/dashboard/kpi-strip'
import { AtRiskPanel } from '@/components/features/dashboard/at-risk-panel'
import { UpcomingSchedulePanel } from '@/components/features/dashboard/upcoming-schedule-panel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type DashboardPageProps = {
	orgId: string
	data: DashboardData
}

export function DashboardPage({ orgId, data }: DashboardPageProps) {
	const generatedAt = new Date(data.generatedAt)
	const generatedAtLabel = Number.isNaN(generatedAt.getTime()) ? data.generatedAt : generatedAt.toLocaleString()

	return (
		<div className='w-full space-y-6'>
			<section className='mx-auto flex w-full max-w-7xl flex-col gap-2'>
				<h1 className='text-2xl font-semibold'>Organization Dashboard</h1>
				<p className='text-sm text-muted-foreground'>
					Org ID: {orgId} | Timezone: {data.timeZone} | Updated: {generatedAtLabel}
				</p>
			</section>

			<div className='mx-auto w-full max-w-7xl space-y-6'>
				<KpiStrip kpis={data.kpis} />

				<section className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
					<AtRiskPanel orgId={orgId} items={data.atRiskEnclosures} timeZone={data.timeZone} />
					<UpcomingSchedulePanel orgId={orgId} items={data.upcomingSchedule} timeZone={data.timeZone} />
				</section>

				<Card>
					<CardHeader>
						<CardTitle>Next Panel</CardTitle>
						<CardDescription>Day 2 will add recent activity feed with links and timestamps.</CardDescription>
					</CardHeader>
					<CardContent className='text-sm text-muted-foreground'>
						Recent task completions, notes, and enclosure creation events will appear here.
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
