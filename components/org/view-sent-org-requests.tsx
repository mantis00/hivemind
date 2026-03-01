'use client'

import { Button } from '@/components/ui/button'
import { XIcon, LoaderCircle, ChevronDownIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useMyOrgRequests, useMemberProfiles } from '@/lib/react-query/queries'
import { useRetractOrgRequest } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { formatDate } from '@/context/format-date'
import { useState } from 'react'
import { UUID } from 'crypto'

function StatusDot({ status }: { status: string }) {
	const colorMap: Record<string, string> = {
		pending: 'bg-amber-400',
		approved: 'bg-emerald-500',
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

export function ViewSentRequests() {
	const { data: user } = useCurrentClientUser()
	const { data: requests, isLoading } = useMyOrgRequests(user?.id ?? '')
	const reviewerIds = [...new Set(requests?.map((r) => r.reviewed_by).filter(Boolean) as string[])]
	const { data: reviewerProfiles } = useMemberProfiles(reviewerIds)
	const retractMutation = useRetractOrgRequest()
	const [pendingRequestId, setPendingRequestId] = useState<UUID | null>(null)
	const { data: userProfile } = useMemberProfiles(user?.id ? [user.id] : [])
	const isSuperadmin = userProfile?.some((profile) => profile.is_superadmin === true)
	if (isSuperadmin) return null

	const handleRetract = (requestId: UUID) => {
		if (!user?.id) return
		setPendingRequestId(requestId)
		retractMutation.mutate({ requestId }, { onSettled: () => setPendingRequestId(null) })
	}

	return (
		<Collapsible defaultOpen>
			<CollapsibleTrigger asChild>
				<button
					type='button'
					className='group flex w-full items-center justify-between py-3 text-left transition-opacity hover:opacity-70'
				>
					<div className='flex items-center gap-3'>
						<h3 className='text-sm font-medium text-foreground'>Organization Requests</h3>
						<span className='text-xs text-muted-foreground'>{requests?.length ?? 0}</span>
					</div>
					<ChevronDownIcon className='h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180' />
				</button>
			</CollapsibleTrigger>
			<CollapsibleContent>
				{isLoading ? (
					<div className='flex justify-center items-center py-4'>
						<LoaderCircle className='animate-spin' />
					</div>
				) : !requests || requests.length === 0 ? (
					<p className='py-2 text-sm text-muted-foreground text-center'>No requests submitted yet.</p>
				) : (
					<div className='divide-y divide-border'>
						{requests.map((request) => (
							<div key={request.request_id} className='flex items-center justify-between gap-3 py-3 first:pt-1'>
								<div className='flex min-w-0 flex-1 flex-col gap-1'>
									<p className='truncate text-sm font-medium text-foreground'>{request.org_name}</p>
									<div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
										<StatusDot status={request.status} />
										<span className='capitalize'>{request.status}</span>
										<span className='text-border'>/</span>
										<span>Submitted {formatDate(request.created_at)}</span>
										{request.reviewed_at && (
											<>
												<span className='text-border'>/</span>
												<span>
													{request.status === 'approved' ? 'Approved' : 'Rejected'} {formatDate(request.reviewed_at)}
													{reviewerProfiles?.find((p) => p.id === request.reviewed_by)?.full_name &&
														` by ${reviewerProfiles.find((p) => p.id === request.reviewed_by)?.full_name}`}
												</span>
											</>
										)}
									</div>
								</div>
								{request.status === 'pending' && (
									<Button
										size='sm'
										variant='ghost'
										onClick={() => handleRetract(request.request_id)}
										disabled={pendingRequestId === request.request_id}
										className='ml-2 h-8 shrink-0 text-xs text-muted-foreground hover:text-destructive'
									>
										{pendingRequestId === request.request_id && retractMutation.isPending ? (
											<LoaderCircle className='h-3.5 w-3.5 animate-spin' />
										) : (
											<>
												<XIcon className='h-3.5 w-3.5' />
												<span className='hidden sm:inline'>Cancel</span>
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
