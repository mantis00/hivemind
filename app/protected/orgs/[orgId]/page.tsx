import { DashboardPage } from '@/components/features/dashboard/dashboard-page'
import { getDashboardData } from '@/lib/dashboard/get-dashboard-data'
import type { DashboardData } from '@/lib/dashboard/types'
import { unstable_noStore as noStore } from 'next/cache'

function createFallbackDashboardData(): DashboardData {
	return {
		generatedAt: new Date().toISOString(),
		timeZone: 'UTC',
		kpis: {
			activeEnclosures: 0,
			tasksDueToday: 0,
			upcomingTasks: 0,
			alerts: 0
		},
		atRiskEnclosures: [],
		upcomingSchedule: [],
		recentActivity: [],
		warnings: []
	}
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message
	}

	return 'Dashboard data failed to load due to an unknown error.'
}

export default async function Page({ params }: { params: Promise<{ orgId: string }> }) {
	noStore()
	const { orgId } = await params
	let loadError: string | null = null
	let dashboardData = createFallbackDashboardData()

	try {
		dashboardData = await getDashboardData(orgId)
	} catch (error) {
		loadError = getErrorMessage(error)
	}

	return <DashboardPage orgId={orgId} data={dashboardData} loadError={loadError} />
}
