import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MemberRow } from '@/components/org/member-row'

export function ViewOrgMembers() {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Member Name</TableHead>
					<TableHead>Member Email</TableHead>
					<TableHead>Access level</TableHead>
					<TableHead>Joined</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<MemberRow />
			</TableBody>
		</Table>
	)
}
