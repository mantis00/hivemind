'use client'

import { useAllOrgRequests } from '@/lib/react-query/queries'
import { useApproveOrgRequest, useRejectOrgRequest } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoaderCircle, Check, X } from 'lucide-react'
import { toast } from 'sonner'

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' | 'cancelled' }) {
	if (status === 'approved') return <Badge variant='default'>Approved</Badge>
	if (status === 'rejected') return <Badge variant='destructive'>Rejected</Badge>
	if (status === 'cancelled') return <Badge variant='outline'>Cancelled</Badge>
	return <Badge variant='secondary'>Pending</Badge>
}

export function OrgRequestsTable() {
	const { data: requests, isLoading, isError } = useAllOrgRequests()
	const { data: currentUser } = useCurrentClientUser()
	const approveMutation = useApproveOrgRequest()
	const rejectMutation = useRejectOrgRequest()

	const pending = requests?.filter((r) => r.status === 'pending') ?? []
	const reviewed = requests?.filter((r) => r.status !== 'pending') ?? []
	const sorted = [...pending, ...reviewed]

	return (
		<div className='rounded-md border'>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Requester</TableHead>
						<TableHead>Email</TableHead>
						<TableHead>Org Name</TableHead>
						<TableHead>Submitted</TableHead>
						<TableHead className='text-center'>Status</TableHead>
						<TableHead className='text-center'>Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{isLoading && (
						<TableRow>
							<TableCell colSpan={6} className='py-10 text-center text-muted-foreground'>
								<div className='flex justify-center items-center gap-2'>
									<LoaderCircle className='h-4 w-4 animate-spin' />
									Loading requests...
								</div>
							</TableCell>
						</TableRow>
					)}

					{isError && (
						<TableRow>
							<TableCell colSpan={6} className='py-10 text-center text-destructive'>
								Failed to load requests.
							</TableCell>
						</TableRow>
					)}

					{!isLoading && !isError && sorted.length === 0 && (
						<TableRow>
							<TableCell colSpan={6} className='py-10 text-center text-muted-foreground'>
								No organization requests yet.
							</TableCell>
						</TableRow>
					)}

					{!isLoading &&
						!isError &&
						sorted.map((req) => {
							const isPending = req.status === 'pending'
							const isActing =
								(approveMutation.isPending && approveMutation.variables?.requestId === req.request_id) ||
								(rejectMutation.isPending && rejectMutation.variables?.requestId === req.request_id)

							return (
								<TableRow key={req.request_id} className={!isPending ? 'opacity-60' : ''}>
									<TableCell className='font-medium'>{req.profiles?.full_name ?? '—'}</TableCell>
									<TableCell className='text-muted-foreground'>{req.profiles?.email ?? '—'}</TableCell>
									<TableCell className='font-medium'>{req.org_name}</TableCell>
									<TableCell className='text-muted-foreground text-sm'>
										{new Date(req.created_at).toLocaleDateString(undefined, {
											year: 'numeric',
											month: 'short',
											day: 'numeric'
										})}
									</TableCell>
									<TableCell className='text-center'>
										<StatusBadge status={req.status} />
									</TableCell>
									<TableCell className='text-center'>
										{isPending ? (
											<div className='flex justify-center gap-2'>
												<Button
													size='sm'
													variant='default'
													disabled={isActing || !currentUser}
													onClick={() =>
														approveMutation.mutate(
															{ requestId: req.request_id, reviewerId: currentUser!.id },
															{
																onSuccess: () => toast.success(`"${req.org_name}" approved`),
																onError: (err) => toast.error(err.message)
															}
														)
													}
												>
													{approveMutation.isPending && approveMutation.variables?.requestId === req.request_id ? (
														<LoaderCircle className='h-3 w-3 animate-spin' />
													) : (
														<Check className='h-3 w-3' />
													)}
													Approve
												</Button>
												<Button
													size='sm'
													variant='destructive'
													disabled={isActing || !currentUser}
													onClick={() =>
														rejectMutation.mutate(
															{ requestId: req.request_id, reviewerId: currentUser!.id },
															{
																onSuccess: () => toast.success(`"${req.org_name}" rejected`),
																onError: (err) => toast.error(err.message)
															}
														)
													}
												>
													{rejectMutation.isPending && rejectMutation.variables?.requestId === req.request_id ? (
														<LoaderCircle className='h-3 w-3 animate-spin' />
													) : (
														<X className='h-3 w-3' />
													)}
													Reject
												</Button>
											</div>
										) : (
											<span className='text-muted-foreground text-sm'>—</span>
										)}
									</TableCell>
								</TableRow>
							)
						})}
				</TableBody>
			</Table>
		</div>
	)
}
