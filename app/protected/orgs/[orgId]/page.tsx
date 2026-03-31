import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export default function Page() {
	return (
		<div className='space-y-4 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl flex'>
				<DashboardShell />
			</div>
		</div>
	)
}
