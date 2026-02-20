import TasksCollapsible from '@/components/tasks/tasks-collapsible'
import TasksLists from '@/components/tasks/tasks-lists'

export default async function Page({ params }: { params: Promise<{ orgId: string; enclosureId: string }> }) {
	const { orgId, enclosureId } = await params

	return (
		<div className='space-y-4 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl'>
				<div className='pb-5 flex-row flex items-center justify-between'>
					<div className='flex-col'>
						<h1 className='text-2xl font-semibold'>
							Show Enclosure details page for enclosure = {enclosureId} for org = {orgId}
						</h1>
					</div>
				</div>
				<TasksLists />
			</div>
		</div>
	)
}
