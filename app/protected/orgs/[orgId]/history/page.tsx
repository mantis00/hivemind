import { TasksTable } from '@/components/history/history-table'
import { UUID } from 'crypto'

export default async function HistoryPage({ params }: { params: Promise<{ orgId: string }> }) {
	const { orgId } = await params

	return (
		<div className='flex flex-col gap-6 p-4 md:p-6'>
			<div>
				<h1 className='text-2xl font-bold'>Activity Log</h1>
				<p className='text-muted-foreground text-sm mt-1'>History of completed tasks across all enclosures.</p>
			</div>
			<TasksTable orgId={orgId as UUID} />
		</div>
	)
}
