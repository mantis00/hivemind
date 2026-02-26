import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import OrgRow from './org-row'
import PendingInvites from '@/components/org/view-pending-invites'
import SuperadminButton from '@/components/org/superadmin-button'
import { ViewSentRequests } from './view-sent-requests'

export function ViewOrgs() {
	return (
		<>
			<div className='mb-4 flex flex-col mx-auto gap-4'>
				<SuperadminButton />
				<PendingInvites />
				<ViewSentRequests />
			</div>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Access level</TableHead>
						<TableHead>Created</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					<OrgRow />
				</TableBody>
			</Table>
		</>
	)
}
