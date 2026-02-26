'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckIcon, XIcon, LoaderCircle } from 'lucide-react'
import { useAllOrgRequests } from '@/lib/react-query/queries'
import { useApproveOrgRequest, useRejectOrgRequest } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { useState } from 'react'
import { UUID } from 'crypto'

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
		approveMutation.mutate(
			{
				requestId,
				reviewerId: user.id
			},
			{
				onSettled: () => setPendingRequestId(null)
			}
		)
	}

	const handleReject = (requestId: UUID) => {
		if (!user?.id) return
		setPendingRequestId(requestId)
		rejectMutation.mutate({ requestId, reviewerId: user.id }, { onSettled: () => setPendingRequestId(null) })
	}

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Pending Organization Requests</CardTitle>
					<CardDescription>Loading requests...</CardDescription>
				</CardHeader>
			</Card>
		)
	}

	if (pendingRequests.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Pending Organization Requests</CardTitle>
					<CardDescription>No pending requests</CardDescription>
				</CardHeader>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Pending Organization Requests</CardTitle>
				<CardDescription>
					{pendingRequests.length} pending request{pendingRequests.length !== 1 ? 's' : ''} awaiting review
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className='space-y-4'>
					{pendingRequests.map((request) => (
						<div
							key={request.request_id}
							className='flex flex-col md:flex-row md:justify-between gap-4 rounded-lg border p-4'
						>
							<div className='flex-1'>
								<div className='flex items-center justify-center md:justify-start gap-2 flex-wrap'>
									<p className='font-medium'>{request.org_name}</p>
									<Badge variant='secondary'>Pending</Badge>
								</div>
								<div className='flex flex-row items-center justify-center md:justify-start gap-2 md:gap-0 mt-1'>
									<p className='text-sm text-muted-foreground'>
										{request.profiles?.full_name ?? 'Unknown'} &bull; {request.profiles?.email ?? ''}
									</p>
									<span className='mx-1 md:mx-2 text-muted-foreground'>•</span>
									<p className='text-sm text-muted-foreground'>
										Submitted on {new Date(request.created_at).toLocaleDateString()}
									</p>
								</div>
							</div>
							<div className='flex gap-2 mx-auto md:mx-0 my-auto'>
								<Button
									size='sm'
									variant='default'
									onClick={() => handleApprove(request.request_id)}
									disabled={pendingRequestId === request.request_id}
								>
									{pendingRequestId === request.request_id && approveMutation.isPending ? (
										<LoaderCircle className='w-4 h-4 animate-spin' />
									) : (
										<>
											<CheckIcon className='w-4 h-4' />
											Approve
										</>
									)}
								</Button>
								<Button
									size='sm'
									variant='outline'
									onClick={() => handleReject(request.request_id)}
									disabled={pendingRequestId === request.request_id}
								>
									{pendingRequestId === request.request_id && rejectMutation.isPending ? (
										<LoaderCircle className='w-4 h-4 animate-spin' />
									) : (
										<>
											<XIcon className='w-4 h-4' />
											Reject
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
