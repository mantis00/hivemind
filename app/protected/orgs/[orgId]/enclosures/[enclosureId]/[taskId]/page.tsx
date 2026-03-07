import { TaskCompleteForm } from '@/components/tasks/task-complete-form'
import { UUID } from 'crypto'

export default async function Page({ params }: { params: Promise<{ orgId: UUID; enclosureId: UUID; taskId: UUID }> }) {
	const { orgId, enclosureId, taskId } = await params

	return (
		<div className='space-y-6 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-xl px-4'>
				<TaskCompleteForm taskId={taskId} orgId={orgId} enclosureId={enclosureId} />
			</div>
		</div>
	)
}
