import { UserActionsTable } from '@/components/history/user-table'
import { UUID } from 'crypto'

export default async function HistoryPage({ params }: { params: Promise<{ orgId: string }> }) {
	const { orgId } = await params

	return (
		<div className='space-y-4 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl flex'>
				<div className='pb-5'>
					<h1 className='text-2xl font-semibold'>User History</h1>
					<p className='text-sm text-muted-foreground'>History of enclosure creations and flags.</p>
				</div>
				<UserActionsTable orgId={orgId as UUID} />
			</div>
		</div>
	)
}
