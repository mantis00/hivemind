'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckIcon, XIcon, LoaderCircle } from 'lucide-react'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { usePendingInvites } from '@/lib/react-query/queries'
import { useAcceptInvite, useRejectInvite } from '@/lib/react-query/mutations'
import getAccessLevelName from '@/context/access-levels'
import { useState } from 'react'
import { UUID } from 'crypto'

export default function PendingInvites() {
	const { data: user } = useCurrentClientUser()
	const { data: invites, isLoading } = usePendingInvites(user?.email || '')
	const acceptMutation = useAcceptInvite()
	const rejectMutation = useRejectInvite()
	const [pendingInviteId, setPendingInviteId] = useState<UUID | null>(null)

	const handleAccept = (inviteId: UUID) => {
		if (!user?.id) return
		setPendingInviteId(inviteId)
		acceptMutation.mutate(
			{
				inviteId,
				userId: user.id
			},
			{
				onSettled: () => setPendingInviteId(null)
			}
		)
	}

	const handleReject = (inviteId: UUID) => {
		if (!user?.id) return
		setPendingInviteId(inviteId)
		rejectMutation.mutate(
			{
				inviteId
			},
			{
				onSettled: () => setPendingInviteId(null)
			}
		)
	}

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Pending Invites</CardTitle>
					<CardDescription>Loading your invitations...</CardDescription>
				</CardHeader>
			</Card>
		)
	}

	if (!invites || invites.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Pending Invites</CardTitle>
					<CardDescription>No pending invites</CardDescription>
				</CardHeader>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Pending Invites</CardTitle>
				<CardDescription>You have {invites.length} pending organization invite(s)</CardDescription>
			</CardHeader>
			<CardContent>
				<div className='space-y-4'>
					{invites.map((invite) => (
						<div
							key={invite.invite_id}
							className='flex flex-col md:flex-row md:justify-between gap-4 rounded-lg border p-4'
						>
							<div className='flex-1'>
								<div className='flex items-center justify-center md:justify-start gap-2 flex-wrap'>
									<p className='font-medium'>{invite.orgs?.name || 'Organization'}</p>
									<Badge variant='secondary'>{getAccessLevelName(invite.access_lvl)}</Badge>
								</div>
								<div className='flex flex-row items-center justify-center md:justify-start gap-2 md:gap-0 mt-1'>
									<p className='text-sm text-muted-foreground'>
										Invited on {new Date(invite.created_at).toLocaleDateString()}
									</p>
									<span className='mx-1 md:mx-2 text-muted-foreground'>•</span>
									<p className='text-sm text-muted-foreground text-red-600'>
										Expires on {new Date(invite.expires_at).toLocaleDateString()}
									</p>
								</div>
							</div>
							<div className='flex gap-2 mx-auto md:mx-0 my-auto'>
								<Button
									size='sm'
									variant='default'
									onClick={() => handleAccept(invite.invite_id)}
									disabled={pendingInviteId === invite.invite_id}
								>
									{pendingInviteId === invite.invite_id && acceptMutation.isPending ? (
										<LoaderCircle className='w-4 h-4 animate-spin' />
									) : (
										<>
											<CheckIcon className='w-4 h-4' />
											Accept
										</>
									)}
								</Button>
								<Button
									size='sm'
									variant='outline'
									onClick={() => handleReject(invite.invite_id)}
									disabled={pendingInviteId === invite.invite_id}
								>
									{pendingInviteId === invite.invite_id && rejectMutation.isPending ? (
										<LoaderCircle className='w-4 h-4 animate-spin' />
									) : (
										<>
											<XIcon className='w-4 h-4' />
											Decline
										</>
									)}
								</Button>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	)
}
