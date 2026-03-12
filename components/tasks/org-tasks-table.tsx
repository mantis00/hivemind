'use client'

import { useParams } from 'next/navigation'
import { UUID } from 'crypto'
import { TasksDataTable } from './tasks-table'

export default function OrgTasksTable() {
	const params = useParams()
	const orgId = params?.orgId as UUID
	return <TasksDataTable orgId={orgId} orgEnclosures />
}
