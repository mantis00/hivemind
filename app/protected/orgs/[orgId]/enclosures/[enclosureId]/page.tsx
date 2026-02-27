// tasks page
import { TasksDataTable } from '@/components/tasks/tasks-table'
import { UUID } from 'crypto'

export default async function Page({ params }: { params: Promise<{ orgId: UUID; enclosureId: UUID }> }) {
	const { orgId, enclosureId } = await params

	return (
		<div className='space-y-4 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl'>
				<div className='pb-5 flex-row flex items-center justify-between'>
					<div className='flex-col w-full'>
						<h1 className='text-2xl font-semibold'>
							Show task details page for enclosure = {enclosureId} for org = {orgId}
						</h1>
						{/* <TasksGrid /> */}
						<TasksDataTable enclosureId={enclosureId} />
					</div>
				</div>
			</div>
		</div>
	)
}
