'use client'

import { useOrgMembers, useMemberProfiles, useIsOwnerOrSuperadmin } from '@/lib/react-query/queries'
import getAccessLevelName from '@/context/access-levels'
import { Calendar, CircleUserRound, LoaderCircle, Mail } from 'lucide-react'
import { useParams } from 'next/navigation'
import { KickMemberButton } from './kick-member-button'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { formatDate } from '@/context/format-date'
import { UUID } from 'crypto'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function MemberRow() {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const { data: orgMembers, isLoading: orgMembersLoading } = useOrgMembers(orgId as UUID)
	const userIds = orgMembers?.map((user) => user.user_id) ?? []
	const { data: memberProfiles, isLoading: profilesLoading } = useMemberProfiles(userIds)
	const { data: currentUser } = useCurrentClientUser()
	const isOwnerOrSuperadmin = useIsOwnerOrSuperadmin(orgId)

	const isLoading = orgMembersLoading || profilesLoading

	if (isLoading) {
		return (
			<div className='flex justify-center items-center py-10 text-muted-foreground gap-2'>
				<LoaderCircle className='h-4 w-4 animate-spin' />
				<span className='text-sm'>Loading members…</span>
			</div>
		)
	}

	if (!memberProfiles || memberProfiles.length === 0) {
		return (
			<div className='rounded-md border py-10 text-center text-sm text-muted-foreground'>
				No members found for this organization
			</div>
		)
	}

	function getMemberAccessLevel(userId: string) {
		return orgMembers?.find((member) => member.user_id === userId)?.access_lvl || 0
	}

	return (
		<div className='space-y-2'>
			{memberProfiles.map((user) => {
				const accessLevel = getMemberAccessLevel(user.id)
				const joinedAt = orgMembers?.find((m) => m.user_id === user.id)?.created_at || ''
				const canKick = isOwnerOrSuperadmin && currentUser?.id !== user.id && accessLevel < 2

				return (
					<Card key={user.id} className='border-l-4 border-l-primary/20 py-2'>
						<CardContent className='p-2'>
							<div className='flex items-center justify-between gap-2 min-w-0'>
								{/* Left: avatar initial + name/email */}
								<div className='flex items-center gap-2 min-w-0'>
									<div className='h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0'>
										<CircleUserRound className='h-4 w-4 text-muted-foreground' />
									</div>
									<div className='min-w-0 space-y-0.5'>
										<p className='font-medium text-sm truncate'>
											{user.first_name} {user.last_name}
										</p>
										<div className='flex items-center gap-1 text-xs text-muted-foreground'>
											<Mail className='h-3 w-3 shrink-0' />
											<span className='truncate'>{user.email}</span>
										</div>
									</div>
								</div>

								{/* Right: badge + joined + kick */}
								<div className='flex items-center gap-2 shrink-0'>
									<div className='hidden sm:flex items-center gap-1 text-xs text-muted-foreground'>
										<Calendar className='h-3 w-3' />
										<span>{formatDate(joinedAt)}</span>
									</div>
									<Badge variant='secondary' className='text-xs font-normal'>
										{getAccessLevelName(accessLevel)}
									</Badge>
									{canKick ? <KickMemberButton memberUserId={user.id} /> : null}
								</div>
							</div>
						</CardContent>
					</Card>
				)
			})}
		</div>
	)
}
