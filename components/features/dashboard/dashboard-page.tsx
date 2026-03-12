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
		<div className='w-full space-y-4 sm:space-y-6'>
			<section className='mx-auto flex w-full max-w-7xl flex-col gap-3'>
				<h1 className='text-2xl font-semibold tracking-tight sm:text-3xl'>Organization Dashboard</h1>
				<div className='flex flex-wrap gap-2 text-xs text-muted-foreground sm:text-sm'>
					<span className='rounded-md border bg-muted/20 px-2.5 py-1'>Org: {shortOrgId}</span>
					<span className='rounded-md border bg-muted/20 px-2.5 py-1'>Timezone: {data.timeZone}</span>
					<span className='rounded-md border bg-muted/20 px-2.5 py-1'>Updated: {generatedAtLabel}</span>
				</div>
			</section>

			<div className='mx-auto w-full max-w-7xl space-y-6'>
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
	)
}
