import { AllMembersTable } from '@/components/superadmin/all-members-table'
import { ViewPendingRequests } from '@/components/superadmin/view-pending-org-requests'
import { SpeciesAdminTable } from '@/components/superadmin/species-admin-table'
import { ViewPendingSpeciesRequests } from '@/components/superadmin/view-pending-species-requests'
import { FeedbackAdminTable } from '@/components/superadmin/feedback-admin-table'
import { BackToOrgs } from '@/components/navigation/back-to-orgs'

export default async function Page() {
	return (
		<div className='space-y-4 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl'>
				<div className='pb-5 flex items-center justify-between'>
					<div>
						<h1 className='text-2xl font-semibold'>Superadmin Tools</h1>
						<p className='text-sm text-muted-foreground'>Hub for managing the Hivemind app, orginizations, and users</p>
					</div>
					<BackToOrgs />
				</div>
				<div className='flex flex-col gap-8'>
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
					<section className='space-y-3'>
						<h2 className='text-lg font-semibold'>User Feedback</h2>
						<FeedbackAdminTable />
					</section>
				</div>
			</div>
		</div>
	)
}
