'use client'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { TrashIcon, LoaderCircle } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useDeleteOrg } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'

export function DeleteOrgButton() {
	const [open, setOpen] = useState(false)
	const router = useRouter()
	const params = useParams()
	const orgId = params?.orgId as number | undefined
	const { data: user } = useCurrentClientUser()
	const deleteOrgMutation = useDeleteOrg()

	const handleDelete = async () => {
		deleteOrgMutation.mutate(
			{ orgId: orgId as number, userId: user?.id as string },
			{
				onSuccess: () => {
					router.push('/protected/orgs')
					setOpen(false)
				}
			}
		)
	}

	return (
		<ResponsiveDialogDrawer
			title='Delete Organization'
			description='Are you sure you want to delete this organization? This action cannot be undone.'
			trigger={
				<Button variant='destructive'>
					Delete Organization <TrashIcon className='w-4 h-4' />
				</Button>
			}
			open={open}
			onOpenChange={(isOpen) => setOpen(isOpen)}
		>
			<Button onClick={handleDelete} variant='destructive' disabled={deleteOrgMutation.isPending || !user}>
				{deleteOrgMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Confirm'}
			</Button>
		</ResponsiveDialogDrawer>
	)
}
