import { ReportsPage } from '@/components/features/reports/reports-page'

export default function Page() {
	return (
		<div className='flex flex-col mx-auto w-full max-w-6xl min-h-[calc(100vh-160px)]'>
			<h1 className='text-2xl font-semibold mb-4'>Reports</h1>
			<ReportsPage />
		</div>
	)
}
