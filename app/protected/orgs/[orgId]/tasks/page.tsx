import { ScheduledTasksTable } from '@/components/tasks/scheduled-tasks'

export default async function Page() {
	return (
		<div className='space-y-4 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl'>
				<div className='pb-5'>
					<h1 className='text-2xl font-semibold'>Tasks</h1>
					<p className='text-sm text-muted-foreground'>Manage your organization&apos;s tasks and details</p>
				</div>
				<div className='flex flex-col gap-6'>
					<section className='space-y-3'>
						<div>
							<h2 className='text-lg font-semibold'>Recurring Schedules</h2>
							<p className='text-sm text-muted-foreground'>
								All active and paused recurring task schedules across your enclosures.
							</p>
						</div>
						<ScheduledTasksTable />
					</section>
				</div>
			</div>
		</div>
	)
}
