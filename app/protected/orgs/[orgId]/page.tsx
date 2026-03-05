import { DashboardPage } from '@/components/features/dashboard/dashboard-page'
import { getDashboardData } from '@/lib/dashboard/get-dashboard-data'

export default async function Page({ params }: { params: Promise<{ orgId: string }> }) {
	const { orgId } = await params
	const dashboardData = await getDashboardData(orgId)

	return <DashboardPage orgId={orgId} data={dashboardData} />
}
