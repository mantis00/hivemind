// tasks page
import { TasksDataTable } from '@/components/tasks/tasks-table'
import { EnclosureHeading } from '@/components/enclosures/enclosure-heading'
import { UUID } from 'crypto'
import { Calendar } from 'lucide-react'

export default async function Page({ params }: { params: Promise<{ orgId: UUID; enclosureId: UUID }> }) {
	const { orgId, enclosureId } = await params

	return (
		<div className='space-y-4 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl'>
				<div className='pb-5 flex-row flex items-center justify-between'>
					<div className='flex-col w-full'>
						<div className='flex flex-row gap-2 pb-6'>
							<Calendar className='h-6 w-6' />
							<EnclosureHeading enclosureId={enclosureId} orgId={orgId} />
						</div>
						<p className='text-sm text-muted-foreground pb-6'>View and manage your organization&apos;s dashboard.</p>
						<TasksDataTable enclosureId={enclosureId} orgId={orgId} />
					</div>
				</div>
			</div>
		</div>
	)
}
