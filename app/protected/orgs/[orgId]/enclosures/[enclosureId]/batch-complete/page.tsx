import { TaskCompleteForm } from '@/components/tasks/task-complete-form'
import { UUID } from 'crypto'

export default async function Page({
	params,
	searchParams
}: {
	params: Promise<{ orgId: UUID; enclosureId: UUID }>
	searchParams: Promise<{ tasks?: string }>
}) {
	const { orgId, enclosureId } = await params
	const { tasks } = await searchParams

	const taskIds = (tasks ?? '')
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean) as UUID[]

	if (taskIds.length === 0) {
		return (
			<div className='flex items-center justify-center h-48'>
				<p className='text-sm text-muted-foreground'>No tasks selected.</p>
			</div>
		)
	}

	return (
		<div className='space-y-6 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-xl px-4'>
				<TaskCompleteForm taskId={taskIds[0]} orgId={orgId} enclosureId={enclosureId} batchTaskIds={taskIds} />
			</div>
		</div>
	)
}
