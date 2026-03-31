'use client'

import { useParams } from 'next/navigation'
import type { UUID } from 'crypto'

import { DashboardPage } from '@/components/dashboard/dashboard-page'
import { DASHBOARD_SERVER_TIME_ZONE } from '@/components/dashboard/dashboard-helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
	type DashboardData,
	useDashboardActiveEnclosureCount,
	useDashboardAtRiskEnclosures,
	useDashboardRecentActivity,
	useDashboardTasksDueToday,
	useDashboardUpcomingTaskCount
} from '@/lib/react-query/queries'

function getErrorMessage(error: unknown) {
	if (error instanceof Error && error.message) {
		return error.message
	}
	return 'Unknown dashboard query error'
}

export function DashboardShell() {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined

	const {
		data: activeEnclosures = 0,
		isLoading: isActiveEnclosuresLoading,
		error: activeEnclosuresError
	} = useDashboardActiveEnclosureCount(orgId)
	const { data: atRiskData, isLoading: isAtRiskLoading, error: atRiskError } = useDashboardAtRiskEnclosures(orgId)
	const {
		data: dueTodayTasks = [],
		isLoading: isDueTodayLoading,
		error: dueTodayError
	} = useDashboardTasksDueToday(orgId)
	const {
		data: upcomingTasksCount = 0,
		isLoading: isUpcomingTasksLoading,
		error: upcomingTasksError
	} = useDashboardUpcomingTaskCount(orgId)
	const {
		data: recentActivity = [],
		isLoading: isRecentActivityLoading,
		error: recentActivityError
	} = useDashboardRecentActivity(orgId)

	const warnings = [
		activeEnclosuresError
			? {
					stage: 'dashboard.activeEnclosures',
					message: `Unable to load active enclosure count (${getErrorMessage(activeEnclosuresError)}).`
				}
			: null,
		atRiskError
			? {
					stage: 'dashboard.atRisk',
					message: `Unable to load at-risk enclosure data (${getErrorMessage(atRiskError)}).`
				}
			: null,
		dueTodayError
			? {
					stage: 'dashboard.tasksDueToday',
					message: `Unable to load tasks due today (${getErrorMessage(dueTodayError)}).`
				}
			: null,
		upcomingTasksError
			? {
					stage: 'dashboard.upcomingTaskCount',
					message: `Unable to load upcoming task count (${getErrorMessage(upcomingTasksError)}).`
				}
			: null,
		recentActivityError
			? {
					stage: 'dashboard.recentActivity',
					message: `Unable to load recent activity (${getErrorMessage(recentActivityError)}).`
				}
			: null
	].filter(Boolean) as DashboardData['warnings']

	const data: DashboardData = {
		generatedAt: new Date().toISOString(),
		timeZone: DASHBOARD_SERVER_TIME_ZONE,
		kpis: {
			activeEnclosures,
			tasksDueToday: dueTodayTasks.length,
			upcomingTasks: upcomingTasksCount,
			alerts: atRiskData?.attentionNeededCount ?? 0
		},
		atRiskEnclosures: atRiskData?.items ?? [],
		upcomingSchedule: dueTodayTasks,
		recentActivity,
		warnings
	}

	const isLoading =
		isActiveEnclosuresLoading ||
		isAtRiskLoading ||
		isDueTodayLoading ||
		isUpcomingTasksLoading ||
		isRecentActivityLoading
	const loadError = activeEnclosuresError ? getErrorMessage(activeEnclosuresError) : null

	if (isLoading) {
		return (
			<div className='grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
				{['Active Enclosures', 'Tasks Due Today', 'Upcoming Tasks', 'Alerts'].map((title) => (
					<section key={title} className='min-h-[136px] animate-pulse rounded-xl border bg-muted/20' />
				))}
			</div>
		)
	}

	if (!orgId) {
		return (
			<Card className='w-full border-destructive/30'>
				<CardHeader>
					<CardTitle>Dashboard Could Not Load</CardTitle>
					<CardDescription>Organization context is missing for this route.</CardDescription>
				</CardHeader>
				<CardContent className='text-sm text-muted-foreground'>Missing `orgId` route parameter.</CardContent>
			</Card>
		)
	}

	return <DashboardPage orgId={String(orgId)} data={data} loadError={loadError} />
}
