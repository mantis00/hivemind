'use client'

import { useTaskName } from '@/lib/react-query/queries'
import { UUID } from 'crypto'
import { useParams } from 'next/navigation'

export default function TaskHeading() {
	const params = useParams()
	const taskId = params?.taskId
	const { data: taskName } = useTaskName(taskId as UUID)

	return <h1 className='text-2xl font-semibold'>{`Task: ${taskName ?? ''}`}</h1>
}
