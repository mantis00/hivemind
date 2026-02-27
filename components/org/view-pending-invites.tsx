'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckIcon, XIcon, LoaderCircle, ChevronDownIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { usePendingInvites } from '@/lib/react-query/queries'
import { useAcceptInvite, useRejectInvite } from '@/lib/react-query/mutations'
import getAccessLevelName from '@/context/access-levels'
import { useState } from 'react'
import { UUID } from 'crypto'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(iso: string, includeYear = true): string {
	const d = new Date(iso)
	const month = MONTHS[d.getUTCMonth()]
	const day = d.getUTCDate()
	if (!includeYear) return `${month} ${day}`
	return `${month} ${day}, ${d.getUTCFullYear()}`
}

export default function PendingInvites() {
	const { data: user } = useCurrentClientUser()
	const { data: invites, isLoading } = usePendingInvites(user?.email || '')
	const acceptMutation = useAcceptInvite()
	const rejectMutation = useRejectInvite()
	const [pendingInviteId, setPendingInviteId] = useState<UUID | null>(null)

	const handleAccept = (inviteId: UUID) => {
		if (!user?.id) return
		setPendingInviteId(inviteId)
		acceptMutation.mutate({ inviteId, userId: user.id }, { onSettled: () => setPendingInviteId(null) })
	}

	const handleReject = (inviteId: UUID) => {
		if (!user?.id) return
		setPendingInviteId(inviteId)
		rejectMutation.mutate({ inviteId }, { onSettled: () => setPendingInviteId(null) })
	}

	return (
		<Collapsible defaultOpen>
			<CollapsibleTrigger asChild>
				<button
					type='button'
					className='group flex w-full items-center justify-between py-3 text-left transition-opacity hover:opacity-70'
				>
					<div className='flex items-center gap-3'>
						<h3 className='text-sm font-medium text-foreground'>Pending Invites</h3>
						<span className='text-xs text-muted-foreground'>{invites?.length ?? 0}</span>
					</div>
					<ChevronDownIcon className='h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180' />
				</button>
			</CollapsibleTrigger>
			<CollapsibleContent>
				{isLoading ? (
					<p className='py-2 text-sm text-muted-foreground text-center'>Loading your invitations...</p>
				) : !invites || invites.length === 0 ? (
					<p className='py-2 text-sm text-muted-foreground text-center'>No pending invites.</p>
				) : (
					<div className='divide-y divide-border'>
						{invites.map((invite) => (
							<div key={invite.invite_id} className='flex items-center justify-between gap-3 py-3 first:pt-1'>
								<div className='flex min-w-0 flex-1 flex-col gap-1'>
									<div className='flex flex-wrap items-center gap-2'>
										<p className='truncate text-sm font-medium text-foreground'>
											{invite.orgs?.name || 'Organization'}
										</p>
										<Badge variant='secondary' className='h-5 px-1.5 py-0 text-[11px] font-normal'>
											{getAccessLevelName(invite.access_lvl)}
										</Badge>
									</div>
									<div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
										<span>Invited {formatDate(invite.created_at)}</span>
										<span className='text-border'>/</span>
										<span>Expires {formatDate(invite.expires_at, false)}</span>
									</div>
								</div>
								<div className='ml-2 flex shrink-0 items-center gap-1'>
									<Button
										size='sm'
										variant='ghost'
										onClick={() => handleAccept(invite.invite_id)}
										disabled={pendingInviteId === invite.invite_id}
										className='h-8 text-xs text-muted-foreground hover:text-foreground'
									>
										{pendingInviteId === invite.invite_id && acceptMutation.isPending ? (
											<LoaderCircle className='h-3.5 w-3.5 animate-spin' />
										) : (
											<>
												<CheckIcon className='h-3.5 w-3.5' />
												<span className='hidden sm:inline'>Accept</span>
											</>
										)}
									</Button>
									<Button
										size='sm'
										variant='ghost'
										onClick={() => handleReject(invite.invite_id)}
										disabled={pendingInviteId === invite.invite_id}
										className='h-8 text-xs text-muted-foreground hover:text-destructive'
									>
										{pendingInviteId === invite.invite_id && rejectMutation.isPending ? (
											<LoaderCircle className='h-3.5 w-3.5 animate-spin' />
										) : (
											<>
												<XIcon className='h-3.5 w-3.5' />
												<span className='hidden sm:inline'>Decline</span>
											</>
										)}
									</Button>
								</div>
							</div>
						))}
					</div>
				)}
			</CollapsibleContent>
		</Collapsible>
	)
}
