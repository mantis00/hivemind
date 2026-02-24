'use client'

import { TableRow, TableCell } from '../ui/table'
import { useOrgMembers, useMemberProfiles } from '@/lib/react-query/queries'
import getAccessLevelName from '@/context/access-levels'
import { LoaderCircle } from 'lucide-react'
import { useParams } from 'next/navigation'
import { KickMemberButton } from './kick-member-button'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { UUID } from 'crypto'

export function MemberRow() {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const { data: orgMembers, isLoading: orgMembersLoading } = useOrgMembers(orgId as UUID)
	const userIds = orgMembers?.map((user) => user.user_id) ?? []
	const { data: memberProfiles, isLoading: profilesLoading } = useMemberProfiles(userIds)
	const { data: currentUser } = useCurrentClientUser()

	const isLoading = orgMembersLoading || profilesLoading

	if (isLoading) {
		return (
			<TableRow>
				<TableCell colSpan={5} className='text-center text-muted-foreground'>
					<div className='flex justify-center items-center py-4'>
						<LoaderCircle className='animate-spin' />
					</div>
				</TableCell>
			</TableRow>
		)
	}

	if (!memberProfiles || memberProfiles.length === 0) {
		return (
			<TableRow>
				<TableCell colSpan={5} className='text-center text-muted-foreground'>
					No members found for this organization
				</TableCell>
			</TableRow>
		)
	}

	function getMemberAccessLevel(userId: string) {
		return orgMembers?.find((member) => member.user_id === userId)?.access_lvl || 0
	}

	const currentUserAccessLevel = currentUser?.id ? getMemberAccessLevel(currentUser.id) : 0

	return (
		<>
			{memberProfiles.map((user) => (
				<TableRow key={user.id}>
					<TableCell>
						{user.first_name} {user.last_name}
					</TableCell>
					<TableCell>{user.email}</TableCell>
					<TableCell>{getAccessLevelName(getMemberAccessLevel(user.id))}</TableCell>
					<TableCell>
						{new Date(orgMembers?.find((member) => member.user_id === user.id)?.created_at || '').toLocaleDateString()}
					</TableCell>
					<TableCell>
						{currentUserAccessLevel === 3 && currentUser?.id !== user.id ? (
							<KickMemberButton memberUserId={user.id} />
						) : (
							<span className='text-muted-foreground text-sm'>—</span>
						)}
					</TableCell>
				</TableRow>
			))}
		</>
	)
}
