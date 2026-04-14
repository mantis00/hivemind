'use client'

import { useRouter } from 'next/navigation'
import { Building2, Calendar, LoaderCircle, LogInIcon } from 'lucide-react'
import { useState } from 'react'
import { LeaveOrgButton } from './leave-org-button'
import getAccessLevelName from '@/context/access-levels'
import { useUserOrgs, type UserOrg } from '@/lib/react-query/queries'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { UUID } from 'crypto'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function OrgCards() {
	const router = useRouter()
	const [loadingOrgId, setLoadingOrgId] = useState<UUID | null>(null)
	const { data: user } = useCurrentClientUser()
	const { data: userOrgs, isLoading: isOrgsLoading } = useUserOrgs(user?.id || '')

	if (isOrgsLoading) {
		return (
			<div className='flex justify-center items-center py-10 text-muted-foreground gap-2'>
				<LoaderCircle className='h-4 w-4 animate-spin' />
				<span className='text-sm'>Loading organizations…</span>
			</div>
		)
	}

	if (!userOrgs || userOrgs.length === 0) {
		return (
			<div className='rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground'>
				No organizations found
			</div>
		)
	}

	return (
		<div className='space-y-3'>
			{userOrgs.map((userOrg: UserOrg) => {
				const isRowLoading = loadingOrgId === userOrg.orgs.org_id
				return (
					<Card
						key={userOrg.orgs.org_id}
						className='border-l-4 border-l-primary/40 py-3 transition-colors hover:bg-accent/30 cursor-pointer'
						onClick={() => {
							setLoadingOrgId(userOrg.orgs.org_id)
							router.push(`/protected/orgs/${userOrg.orgs.org_id}`)
						}}
					>
						<CardContent className='px-4 py-0'>
							<div className='flex items-center gap-3 min-w-0'>
								{/* Icon */}
								<div className='h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0'>
									<Building2 className='h-4 w-4 text-primary' />
								</div>

								{/* Name + meta */}
								<div className='flex-1 min-w-0 space-y-0.5'>
									<p className='font-semibold text-sm truncate'>{userOrg.orgs.name}</p>
									<div className='flex items-center gap-2 text-xs text-muted-foreground'>
										<Badge variant='secondary' className='text-xs font-normal h-4 px-1.5'>
											{getAccessLevelName(userOrg.access_lvl)}
										</Badge>
									</div>
								</div>

								{/* Actions */}
								<div className='flex items-center gap-1.5 shrink-0' onClick={(e) => e.stopPropagation()}>
									{/* Date — hidden on mobile, shown on desktop */}
									<span className='hidden sm:flex items-center gap-1 text-xs text-muted-foreground mr-1'>
										<Calendar className='h-3 w-3' />
										{new Date(userOrg.orgs.created_at).toLocaleDateString(undefined, {
											month: 'short',
											day: 'numeric',
											year: 'numeric'
										})}
									</span>
									{userOrg.access_lvl < 2 && <LeaveOrgButton orgId={userOrg.orgs.org_id} />}
									<Button
										size='sm'
										className='h-7 px-2 gap-1 text-xs'
										disabled={isRowLoading}
										onClick={(e) => {
											e.stopPropagation()
											setLoadingOrgId(userOrg.orgs.org_id)
											router.push(`/protected/orgs/${userOrg.orgs.org_id}`)
										}}
									>
										{isRowLoading ? (
											<LoaderCircle className='h-3 w-3 animate-spin' />
										) : (
											<>
												<LogInIcon className='h-3 w-3' />
												Enter
											</>
										)}
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				)
			})}
		</div>
	)
}
