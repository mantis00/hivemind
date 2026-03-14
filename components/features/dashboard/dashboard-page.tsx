import type { DashboardData } from '@/lib/react-query/queries'
import { KpiStrip } from '@/components/features/dashboard/kpi-strip'
import { AtRiskPanel } from '@/components/features/dashboard/at-risk-panel'
import { UpcomingSchedulePanel } from '@/components/features/dashboard/upcoming-schedule-panel'
import { RecentActivityPanel } from '@/components/features/dashboard/recent-activity-panel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type DashboardPageProps = {
	orgId: string
	data: DashboardData
	loadError?: string | null
}

function isDashboardEmpty(data: DashboardData) {
	return (
		data.kpis.activeEnclosures === 0 &&
		data.kpis.tasksDueToday === 0 &&
		data.kpis.upcomingTasks === 0 &&
		data.kpis.alerts === 0 &&
		data.atRiskEnclosures.length === 0 &&
		data.upcomingSchedule.length === 0 &&
		data.recentActivity.length === 0
	)
}

export function DashboardPage({ orgId, data, loadError = null }: DashboardPageProps) {
	const generatedAt = new Date(data.generatedAt)
	const generatedAtLabel = Number.isNaN(generatedAt.getTime()) ? data.generatedAt : generatedAt.toLocaleString()
	const dashboardIsEmpty = isDashboardEmpty(data)
	const shortOrgId = orgId.length > 12 ? `${orgId.slice(0, 8)}...${orgId.slice(-4)}` : orgId
	const completedTodayCount = data.recentActivity.length
	const atRiskEnclosureCount = data.atRiskEnclosures.length

	return (
		<div className='space-y-4 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl flex'>
				<div className='pb-5'>
					<h1 className='text-2xl font-semibold'>Dashboard</h1>
					<p className='text-sm text-muted-foreground'>
						Overview for org {shortOrgId}. Timezone: {data.timeZone}. Updated: {generatedAtLabel}.
					</p>
				</div>

				<div className='flex flex-col gap-6'>
					{loadError ? (
						<Card className='border-destructive/30'>
							<CardHeader>
								<CardTitle>Dashboard Loaded With Errors</CardTitle>
								<CardDescription>
									Some dashboard data could not be loaded. Showing currently available information.
								</CardDescription>
							</CardHeader>
							<CardContent className='text-sm text-muted-foreground'>{loadError}</CardContent>
						</Card>
					) : null}

					{data.warnings.length > 0 ? (
						<Card className='border-amber-500/30'>
							<CardHeader>
								<CardTitle>Data Warnings</CardTitle>
								<CardDescription>Some non-critical queries failed or were skipped to reduce DB usage.</CardDescription>
							</CardHeader>
							<CardContent className='space-y-2 text-sm text-muted-foreground'>
								{data.warnings.map((warning) => (
									<p key={`${warning.stage}-${warning.message}`}>
										[{warning.stage}] {warning.message}
									</p>
								))}
							</CardContent>
						</Card>
					) : null}

					<KpiStrip kpis={data.kpis} completedToday={completedTodayCount} atRiskEnclosures={atRiskEnclosureCount} />

					{dashboardIsEmpty ? (
						<Card>
							<CardHeader>
								<CardTitle>No Dashboard Data Yet</CardTitle>
								<CardDescription>This organization does not have activity to summarize yet.</CardDescription>
							</CardHeader>
							<CardContent className='text-sm text-muted-foreground'>
								Add an enclosure, create tasks, or log notes to populate this dashboard.
							</CardContent>
						</Card>
					) : null}

					<section className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
						<AtRiskPanel orgId={orgId} items={data.atRiskEnclosures} timeZone={data.timeZone} />
						<UpcomingSchedulePanel
							orgId={orgId}
							items={data.upcomingSchedule}
							kpis={data.kpis}
							timeZone={data.timeZone}
						/>
					</section>

					<RecentActivityPanel orgId={orgId} items={data.recentActivity} timeZone={data.timeZone} />
				</div>
			</div>
		</div>
	)
}
