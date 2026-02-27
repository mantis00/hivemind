'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { XIcon, LoaderCircle, ChevronDownIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useSentInvites } from '@/lib/react-query/queries'
import { useRetractInvite } from '@/lib/react-query/mutations'
import getAccessLevelName from '@/context/access-levels'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { useIsOwnerOrSuperadmin } from '@/lib/react-query/queries'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { UUID } from 'crypto'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(iso: string, includeYear = true): string {
	const d = new Date(iso)
	const month = MONTHS[d.getUTCMonth()]
	const day = d.getUTCDate()
	if (!includeYear) return `${month} ${day}`
	return `${month} ${day}, ${d.getUTCFullYear()}`
}

function StatusDot({ status }: { status: string }) {
	const colorMap: Record<string, string> = {
		pending: 'bg-amber-400',
		accepted: 'bg-emerald-500',
		rejected: 'bg-destructive',
		cancelled: 'bg-muted-foreground'
	}
	return (
		<span
			className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${colorMap[status] ?? 'bg-muted-foreground'}`}
			aria-hidden='true'
		/>
	)
}

export function ViewSentInvites() {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const { data: invites, isLoading } = useSentInvites(orgId as UUID)
	const retractMutation = useRetractInvite()
	const { data: user } = useCurrentClientUser()
	const isOwnerOrSuperadmin = useIsOwnerOrSuperadmin(orgId)
	const [pendingInviteId, setPendingInviteId] = useState<string | null>(null)

	if (!isOwnerOrSuperadmin) return null

	const handleRetract = (inviteId: UUID) => {
		if (!user?.id) return
		setPendingInviteId(inviteId)
		retractMutation.mutate({ inviteId }, { onSettled: () => setPendingInviteId(null) })
	}

	return (
		<Collapsible defaultOpen>
			<CollapsibleTrigger asChild>
				<button
					type='button'
					className='group flex w-full items-center justify-between py-3 text-left transition-opacity hover:opacity-70'
				>
					<div className='flex items-center gap-3'>
						<h3 className='text-sm font-medium text-foreground'>Sent Invites</h3>
						<span className='text-xs text-muted-foreground'>{invites?.length ?? 0}</span>
					</div>
					<ChevronDownIcon className='h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180' />
				</button>
			</CollapsibleTrigger>
			<CollapsibleContent>
				{isLoading ? (
					<div className='flex justify-center items-center py-4'>
						<LoaderCircle className='animate-spin' />
					</div>
				) : !invites || invites.length === 0 ? (
					<p className='py-2 text-sm text-muted-foreground text-center'>No invites sent yet.</p>
				) : (
					<div className='divide-y divide-border'>
						{invites.map((invite) => (
							<div key={invite.invite_id} className='flex items-center justify-between gap-3 py-3 first:pt-1'>
								<div className='flex min-w-0 flex-1 flex-col gap-1'>
									<div className='flex flex-wrap items-center gap-2'>
										<p className='truncate text-sm font-medium text-foreground'>{invite.invitee_email}</p>
										<Badge variant='secondary' className='h-5 px-1.5 py-0 text-[11px] font-normal'>
											{getAccessLevelName(invite.access_lvl)}
										</Badge>
									</div>
									<div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
										<StatusDot status={invite.status} />
										<span className='capitalize'>{invite.status}</span>
										<span className='text-border'>/</span>
										<span>{formatDate(invite.created_at)}</span>
										{invite.status === 'pending' && (
											<>
												<span className='text-border'>/</span>
												<span>Expires {formatDate(invite.expires_at, false)}</span>
											</>
										)}
									</div>
								</div>
								{invite.status === 'pending' && (
									<Button
										size='sm'
										variant='ghost'
										onClick={() => handleRetract(invite.invite_id)}
										disabled={pendingInviteId === invite.invite_id}
										className='ml-2 h-8 shrink-0 text-xs text-muted-foreground hover:text-destructive'
									>
										{pendingInviteId === invite.invite_id && retractMutation.isPending ? (
											<LoaderCircle className='h-3.5 w-3.5 animate-spin' />
										) : (
											<>
												<XIcon className='h-3.5 w-3.5' />
												<span className='hidden sm:inline'>Revoke</span>
											</>
										)}
									</Button>
								)}
							</div>
						))}
					</div>
				)}
			</CollapsibleContent>
		</Collapsible>
	)
}
