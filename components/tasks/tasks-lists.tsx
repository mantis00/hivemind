'use client'

import TasksCollapsible from '@/components/tasks/tasks-collapsible'
import { useEnclosureIdPriority } from '@/lib/react-query/queries'
import { useParams } from 'next/navigation'

export default function TasksLists() {
	const params = useParams()
	const orgId = params?.orgId as number | undefined
	const enclosureId = params?.enclosureId as number | undefined
	const { data } = useEnclosureIdPriority(enclosureId as number)
	console.log(data)

	return (
		<div>
			{data?.map((priority) => (
				<TasksCollapsible priority={priority.priority} orgId={orgId as number} />
			))}
		</div>
	)
}
