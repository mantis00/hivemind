import { AllMembersTable } from '@/components/superadmin/all-members-table'
import { ViewPendingRequests } from '@/components/superadmin/view-pending-org-requests'
import { SpeciesAdminTable } from '@/components/superadmin/species-admin-table'
import { ViewPendingSpeciesRequests } from '@/components/superadmin/view-pending-species-requests'

export default async function Page() {
	return (
		<div className='space-y-4 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl'>
				<div className='pb-5'>
					<h1 className='text-2xl font-semibold'>Superadmin Tools</h1>
				</div>
				<div className='flex flex-col gap-8'>
					<p className='text-sm text-muted-foreground'>Hub for managing the Hivemind app, orginizations, and users</p>
					<section className='space-y-3'>
						<h2 className='text-lg font-semibold'>Requests</h2>
						<ViewPendingRequests />
						<ViewPendingSpeciesRequests />
					</section>
					<section className='space-y-3'>
						<h2 className='text-lg font-semibold'>All Members</h2>
						<AllMembersTable />
					</section>
					<section className='space-y-3'>
						<h2 className='text-lg font-semibold'>Species Management</h2>
						<SpeciesAdminTable />
					</section>
				</div>
			</div>
		</div>
	)
}
