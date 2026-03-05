import { DashboardPage } from '@/components/features/dashboard/dashboard-page'
import { getDashboardData } from '@/lib/dashboard/get-dashboard-data'
import { unstable_noStore as noStore } from 'next/cache'

export default async function Page({ params }: { params: Promise<{ orgId: string }> }) {
	noStore()
	const { orgId } = await params
	const dashboardData = await getDashboardData(orgId)

	return <DashboardPage orgId={orgId} data={dashboardData} />
}
