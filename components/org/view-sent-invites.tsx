'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { XIcon, LoaderCircle, ChevronDownIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useSentInvites } from '@/lib/react-query/queries'
import { useRetractInvite } from '@/lib/react-query/mutations'
import getAccessLevelName from '@/context/access-levels'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { UUID } from 'crypto'

function getStatusBadge(status: string) {
	switch (status) {
		case 'pending':
			return <Badge variant='secondary'>Pending</Badge>
		case 'accepted':
			return <Badge variant='default'>Accepted</Badge>
		case 'rejected':
			return <Badge variant='destructive'>Rejected</Badge>
		default:
			return <Badge variant='outline'>{status}</Badge>
	}
}

export function ViewSentInvites() {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const { data: invites, isLoading } = useSentInvites(orgId as UUID)
	const retractMutation = useRetractInvite()
	const { data: user } = useCurrentClientUser()
	const [pendingInviteId, setPendingInviteId] = useState<string | null>(null)

	const handleRetract = (inviteId: string) => {
		if (!user?.id) return
		setPendingInviteId(inviteId)
		retractMutation.mutate(
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
					<CardTitle>Sent Invites</CardTitle>
					<CardDescription>Loading invitations...</CardDescription>
				</CardHeader>
			</Card>
		)
	}

	if (!invites || invites.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Sent Invites</CardTitle>
					<CardDescription>No invites sent yet</CardDescription>
				</CardHeader>
			</Card>
		)
	}

	return (
		<Card className='border-0 bg-transparent py-0 shadow-none'>
			<Collapsible className='rounded-xl border bg-card'>
				<CardHeader className='px-6 pt-6 pb-2'>
					<CollapsibleTrigger asChild>
						<Button
							variant='ghost'
							className='group w-full justify-between px-0 hover:bg-transparent active:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0'
						>
							<div className='flex flex-col items-start'>
								<CardTitle>Sent Invites</CardTitle>
								<CardDescription>
									<div className='flex flex-row gap-2 items-center'>
										<span>{invites.length} invite(s) sent</span>
									</div>
								</CardDescription>
							</div>
							<ChevronDownIcon className='ml-2 h-4 w-4 transition-transform group-data-[state=open]:rotate-180' />
						</Button>
					</CollapsibleTrigger>
				</CardHeader>
				<CollapsibleContent>
					<CardContent className='px-6 pb-6'>
						<div className='space-y-4'>
							{invites.map((invite) => (
								<div
									key={invite.invite_id}
									className='flex flex-col md:flex-row md:justify-between gap-4 rounded-lg border bg-background p-4'
								>
									<div className='flex-1'>
										<div className='flex items-center justify-center md:justify-start gap-2 flex-wrap flex-col md:flex-row'>
											<p className='font-medium'>{invite.invitee_email}</p>
											<div className='flex items-center gap-2'>
												<Badge variant='secondary'>{getAccessLevelName(invite.access_lvl)}</Badge>
												{getStatusBadge(invite.status)}
											</div>
										</div>
										<div className='flex flex-row items-center justify-center md:justify-start gap-2 md:gap-0 mt-1'>
											<p className='text-sm text-muted-foreground'>
												Sent on {new Date(invite.created_at).toLocaleDateString()}
											</p>
											{invite.status === 'pending' && (
												<>
													<span className='mx-1 md:mx-2 text-muted-foreground'>•</span>
													<p className='text-sm text-muted-foreground text-red-600'>
														Expires on {new Date(invite.expires_at).toLocaleDateString()}
													</p>
												</>
											)}
										</div>
									</div>
									{invite.status === 'pending' && (
										<div className='flex gap-2 mx-auto md:mx-0 my-auto'>
											<Button
												size='sm'
												variant='destructive'
												onClick={() => handleRetract(invite.invite_id)}
												disabled={pendingInviteId === invite.invite_id}
											>
												{pendingInviteId === invite.invite_id && retractMutation.isPending ? (
													<LoaderCircle className='w-4 h-4 animate-spin' />
												) : (
													<>
														<XIcon className='w-4 h-4' />
														Cancel
													</>
												)}
											</Button>
										</div>
									)}
								</div>
							))}
						</div>
					</CardContent>
				</CollapsibleContent>
			</Collapsible>
		</Card>
	)
}
