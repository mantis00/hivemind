import { TasksPage } from '@/components/features/tasks/tasks-page'

export default function Page() {
	return (
		<div className='flex flex-col mx-auto w-full max-w-6xl min-h-[calc(100vh-160px)]'>
			<h1 className='text-2xl font-semibold mb-4'>Tasks</h1>
			<TasksPage />
		</div>
	)
}
