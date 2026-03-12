import OrgTasksTable from '@/components/tasks/org-tasks-table'

export default async function Page() {
	return (
		<div className='space-y-4 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl'>
				<div className='pb-5'>
					<h1 className='text-2xl font-semibold'>Tasks</h1>
					<p className='text-sm text-muted-foreground'>Your organization&apos;s tasks</p>
				</div>
				<div className='flex flex-col gap-6'>
					<section className='space-y-3'>
						<OrgTasksTable />
					</section>
				</div>
			</div>
		</div>
	)
}
