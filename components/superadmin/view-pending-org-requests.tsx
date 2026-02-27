'use client'

import { Button } from '@/components/ui/button'
import { CheckIcon, XIcon, LoaderCircle, ChevronDownIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useAllOrgRequests } from '@/lib/react-query/queries'
import { useApproveOrgRequest, useRejectOrgRequest } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { useState } from 'react'
import { UUID } from 'crypto'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(iso: string): string {
	const d = new Date(iso)
	const month = MONTHS[d.getUTCMonth()]
	const day = d.getUTCDate()
	return `${month} ${day}, ${d.getUTCFullYear()}`
}

export function ViewPendingRequests() {
	const { data: user } = useCurrentClientUser()
	const { data: requests, isLoading } = useAllOrgRequests()
	const approveMutation = useApproveOrgRequest()
	const rejectMutation = useRejectOrgRequest()
	const [pendingRequestId, setPendingRequestId] = useState<UUID | null>(null)

	const pendingRequests = requests?.filter((r) => r.status === 'pending') ?? []

	const handleApprove = (requestId: UUID) => {
		if (!user?.id) return
		setPendingRequestId(requestId)
		approveMutation.mutate({ requestId, reviewerId: user.id }, { onSettled: () => setPendingRequestId(null) })
	}

	const handleReject = (requestId: UUID) => {
		if (!user?.id) return
		setPendingRequestId(requestId)
		rejectMutation.mutate({ requestId, reviewerId: user.id }, { onSettled: () => setPendingRequestId(null) })
	}

	return (
		<Collapsible defaultOpen>
			<CollapsibleTrigger asChild>
				<button
					type='button'
					className='group flex w-full items-center justify-between py-3 text-left transition-opacity hover:opacity-70'
				>
					<div className='flex items-center gap-3'>
						<h3 className='text-sm font-medium text-foreground'>Pending Requests</h3>
						<span className='text-xs text-muted-foreground'>{pendingRequests.length}</span>
					</div>
					<ChevronDownIcon className='h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180' />
				</button>
			</CollapsibleTrigger>
			<CollapsibleContent>
				{isLoading ? (
					<p className='py-2 text-sm text-muted-foreground text-center'>Loading requests...</p>
				) : pendingRequests.length === 0 ? (
					<p className='py-2 text-sm text-muted-foreground text-center'>No pending requests.</p>
				) : (
					<div className='divide-y divide-border'>
						{pendingRequests.map((request) => (
							<div key={request.request_id} className='flex items-center justify-between gap-3 py-3 first:pt-1'>
								<div className='flex min-w-0 flex-1 flex-col gap-1'>
									<p className='truncate text-sm font-medium text-foreground'>{request.org_name}</p>
									<div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
										<span>{request.profiles?.full_name ?? 'Unknown'}</span>
										{request.profiles?.email && (
											<>
												<span className='text-border'>/</span>
												<span>{request.profiles.email}</span>
											</>
										)}
										<span className='text-border'>/</span>
										<span>Submitted {formatDate(request.created_at)}</span>
									</div>
								</div>
								<div className='ml-2 flex shrink-0 items-center gap-1'>
									<Button
										size='sm'
										variant='ghost'
										onClick={() => handleApprove(request.request_id)}
										disabled={pendingRequestId === request.request_id}
										className='h-8 text-xs text-muted-foreground hover:text-foreground'
									>
										{pendingRequestId === request.request_id && approveMutation.isPending ? (
											<LoaderCircle className='h-3.5 w-3.5 animate-spin' />
										) : (
											<>
												<CheckIcon className='h-3.5 w-3.5' />
												<span className='hidden sm:inline'>Approve</span>
											</>
										)}
									</Button>
									<Button
										size='sm'
										variant='ghost'
										onClick={() => handleReject(request.request_id)}
										disabled={pendingRequestId === request.request_id}
										className='h-8 text-xs text-muted-foreground hover:text-destructive'
									>
										{pendingRequestId === request.request_id && rejectMutation.isPending ? (
											<LoaderCircle className='h-3.5 w-3.5 animate-spin' />
										) : (
											<>
												<XIcon className='h-3.5 w-3.5' />
												<span className='hidden sm:inline'>Reject</span>
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
