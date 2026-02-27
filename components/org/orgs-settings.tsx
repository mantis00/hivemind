'use client'

import { DeleteOrgButton } from '@/components/org/delete-org-button'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { useIsOwnerOrSuperadmin } from '@/lib/react-query/queries'
import { UUID } from 'crypto'
import { useParams } from 'next/navigation'

export function OrgSettings() {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const isOwnerOrSuperadmin = useIsOwnerOrSuperadmin(orgId)

	return (
		<div className='space-y-4'>
			{isOwnerOrSuperadmin && (
				<div className='gap-2 flex'>
					<DeleteOrgButton />
				</div>
			)}
		</div>
	)
}
