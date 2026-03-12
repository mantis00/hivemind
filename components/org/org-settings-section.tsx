'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings2, Trash2 } from 'lucide-react'
import { DeleteOrgButton } from '@/components/org/delete-org-button'
import { useIsOwnerOrSuperadmin } from '@/lib/react-query/queries'
import { useParams } from 'next/navigation'
import { UUID } from 'crypto'

export function OrgSettingsSection() {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const isOwnerOrSuperadmin = useIsOwnerOrSuperadmin(orgId)

	if (!isOwnerOrSuperadmin) return null

	return (
		<Card>
			<CardHeader>
				<CardTitle className='flex items-center gap-2 text-base'>
					<Settings2 className='h-4 w-4' /> Danger Zone
				</CardTitle>
				<CardDescription>Irreversible actions for this organization</CardDescription>
			</CardHeader>
			<CardContent className='grid gap-5'>
				<div className='flex items-center justify-between gap-4'>
					<div className='flex items-center gap-3 min-w-0'>
						<div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted'>
							<Trash2 className='h-4 w-4 text-muted-foreground' />
						</div>
						<div className='min-w-0'>
							<p className='text-sm font-medium'>Delete organization</p>
							<p className='text-sm text-muted-foreground'>Permanently delete this organization and all its data</p>
						</div>
					</div>
					<DeleteOrgButton />
				</div>
			</CardContent>
		</Card>
	)
}
