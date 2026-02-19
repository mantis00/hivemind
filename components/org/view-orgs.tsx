import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { OrgRow } from './org-row'
import { PendingInvites } from './view-pending-invites'

export function ViewOrgs() {
	return (
		<>
			<div className='mb-4 flex flex-col mx-auto'>
				<PendingInvites />
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
