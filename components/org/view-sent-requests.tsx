'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { XIcon, LoaderCircle, ChevronDownIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useMyOrgRequests } from '@/lib/react-query/queries'
import { useRetractOrgRequest } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { useState } from 'react'
import { UUID } from 'crypto'

function getStatusBadge(status: string) {
	switch (status) {
		case 'pending':
			return <Badge variant='secondary'>Pending</Badge>
		case 'approved':
			return <Badge variant='default'>Approved</Badge>
		case 'rejected':
			return <Badge variant='destructive'>Rejected</Badge>
		case 'cancelled':
			return <Badge variant='outline'>Cancelled</Badge>
		default:
			return <Badge variant='outline'>{status}</Badge>
	}
}

export function ViewSentRequests() {
	const { data: user } = useCurrentClientUser()
	const { data: requests, isLoading } = useMyOrgRequests(user?.id ?? '')
	const retractMutation = useRetractOrgRequest()
	const [pendingRequestId, setPendingRequestId] = useState<UUID | null>(null)

	const handleRetract = (requestId: UUID) => {
		if (!user?.id) return
		setPendingRequestId(requestId)
		retractMutation.mutate(
			{ requestId },
			{
				onSettled: () => setPendingRequestId(null)
			}
		)
	}

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Organization Requests</CardTitle>
					<CardDescription>Loading your requests...</CardDescription>
				</CardHeader>
			</Card>
		)
	}

	if (!requests || requests.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Organization Requests</CardTitle>
					<CardDescription>No requests submitted yet</CardDescription>
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
								<CardTitle>Organization Requests</CardTitle>
								<CardDescription>
									<div className='flex flex-row gap-2 items-center'>
										<span>{requests.length} request(s) submitted</span>
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
							{requests.map((request) => (
								<div
									key={request.request_id}
									className='flex flex-col md:flex-row md:justify-between gap-4 rounded-lg border bg-background p-4'
								>
									<div className='flex-1'>
										<div className='flex items-center justify-center md:justify-start gap-2 flex-wrap flex-col md:flex-row'>
											<p className='font-medium'>{request.org_name}</p>
											<div className='flex items-center gap-2'>{getStatusBadge(request.status)}</div>
										</div>
										<div className='flex flex-row items-center justify-center md:justify-start gap-2 md:gap-0 mt-1'>
											<p className='text-sm text-muted-foreground'>
												Submitted on {new Date(request.created_at).toLocaleDateString()}
											</p>
											{request.reviewed_at && (
												<>
													<span className='mx-1 md:mx-2 text-muted-foreground'>•</span>
													<p className='text-sm text-muted-foreground'>
														Reviewed on {new Date(request.reviewed_at).toLocaleDateString()}
													</p>
												</>
											)}
										</div>
									</div>
									{request.status === 'pending' && (
										<div className='flex gap-2 mx-auto md:mx-0 my-auto'>
											<Button
												size='sm'
												variant='destructive'
												onClick={() => handleRetract(request.request_id)}
												disabled={pendingRequestId === request.request_id}
											>
												{pendingRequestId === request.request_id && retractMutation.isPending ? (
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
