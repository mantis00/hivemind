import { DashboardPage } from '@/components/features/dashboard/dashboard-page'

export default function Page() {
	return (
		<div className='flex flex-col mx-auto w-full max-w-7xl min-h-[calc(100vh-160px)]'>
			<h1 className='text-2xl font-semibold mb-4'>Dashboard</h1>
			<DashboardPage />
		</div>
	)
}
