'use client'

import { useRouter } from 'next/navigation'
import { TableRow, TableCell } from '../ui/table'
import { Button } from '../ui/button'
import { EyeIcon, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { LeaveOrgButton } from './leave-org-button'
import getAccessLevelName from '@/context/access-levels'
import { useUserOrgs, type UserOrg } from '@/lib/react-query/queries'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { UUID } from 'crypto'

export function OrgRow() {
	const router = useRouter()
	const [loadingOrgId, setLoadingOrgId] = useState<UUID | null>(null)
	const { data: user } = useCurrentClientUser()
	const { data: userOrgs, isLoading: isOrgsLoading } = useUserOrgs(user?.id || '')

	if (isOrgsLoading) {
		return (
			<TableRow>
				<TableCell colSpan={3} className='text-center text-muted-foreground'>
					<div className='flex justify-center items-center py-4'>
						<LoaderCircle className='animate-spin' />
					</div>
				</TableCell>
			</TableRow>
		)
	}

	if (!userOrgs || userOrgs.length === 0) {
		return (
			<TableRow>
				<TableCell colSpan={3} className='text-center text-muted-foreground'>
					No organizations found
				</TableCell>
			</TableRow>
		)
	}

	return (
		<>
			{userOrgs.map((userOrg: UserOrg) => {
				const isRowLoading = loadingOrgId === userOrg.orgs.org_id
				return (
					<TableRow key={userOrg.orgs.org_id}>
						<TableCell>{userOrg.orgs.name}</TableCell>
						<TableCell>{getAccessLevelName(userOrg.access_lvl)}</TableCell>
						<TableCell>{new Date(userOrg.orgs.created_at).toLocaleDateString()}</TableCell>
						<TableCell className='flex'>
							<Button
								onClick={() => {
									setLoadingOrgId(userOrg.orgs.org_id)
									router.push(`/protected/orgs/${userOrg.orgs.org_id}`)
								}}
								disabled={isRowLoading}
							>
								{isRowLoading ? (
									<LoaderCircle className='animate-spin' />
								) : (
									<>
										View <EyeIcon className='w-4 h-4' />
									</>
								)}
							</Button>
						</TableCell>
						{userOrg.access_lvl !== 3 && (
							<TableCell>
								<LeaveOrgButton />
							</TableCell>
						)}
					</TableRow>
				)
			})}
		</>
	)
}
