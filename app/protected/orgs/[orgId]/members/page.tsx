import { MemberRow } from '@/components/org/member-row'
import { ViewSentInvites } from '@/components/org/view-sent-invites'
import { InviteMemberButton } from '@/components/org/invite-org-button'

export default async function Page() {
	return (
		<div className='space-y-4 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl flex'>
				<div className='pb-5'>
					<h1 className='text-2xl font-semibold'>Members</h1>
					<p className='text-sm text-muted-foreground'>Manage your organization&apos;s members and roles</p>
				</div>
				<div className='flex flex-col gap-4'>
					<InviteMemberButton />
					<ViewSentInvites />
					<MemberRow />
				</div>
			</div>
		</div>
	)
}
