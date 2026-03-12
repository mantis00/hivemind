// TODO: Implement this route as a Kanban-style tasks board similar to the original plan.
// TODO: Dashboard "Upcoming Schedule" should consume the Kanban board's "To Do" section from this page.
import { TasksDataTable } from '@/components/tasks/tasks-table'
import { EnclosureHeading } from '@/components/enclosures/enclosure-heading'
import { UUID } from 'crypto'

export default async function Page({ params }: { params: Promise<{ orgId: UUID; enclosureId: UUID }> }) {
	const { orgId, enclosureId } = await params

	return (
		<div className='space-y-4 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl'>
				<div className='pb-5 flex-row flex items-center justify-between'>
					<div className='flex-col w-full'>
						<div className='flex flex-row gap-2 pb-6'>
							<EnclosureHeading enclosureId={enclosureId} orgId={orgId} />
						</div>
						<TasksDataTable enclosureId={enclosureId} orgId={orgId} />
					</div>
				</div>
			</div>
		</div>
	)
}
