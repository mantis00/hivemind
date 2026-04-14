'use client'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { TrashIcon, LoaderCircle } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useDeleteOrg } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { UUID } from 'crypto'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function DeleteOrgButton({ disabled }: { disabled?: boolean }) {
	const [open, setOpen] = useState(false)
	const router = useRouter()
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const { data: user } = useCurrentClientUser()
	const deleteOrgMutation = useDeleteOrg()

	const handleDelete = async () => {
		deleteOrgMutation.mutate(
			{ orgId: orgId as UUID, userId: user?.id as string },
			{
				onSuccess: () => {
					router.push('/protected/orgs')
					setOpen(false)
				}
			}
		)
	}

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<span className={disabled ? 'cursor-not-allowed' : undefined}>
						<Button variant='destructive' disabled={disabled} onClick={() => !disabled && setOpen(true)}>
							<span className='hidden sm:inline'>Delete Organization</span> <TrashIcon className='w-4 h-4' />
						</Button>
					</span>
				</TooltipTrigger>
				{disabled && <TooltipContent>You don&apos;t have permission to perform this action</TooltipContent>}
			</Tooltip>
			<ResponsiveDialogDrawer
				title='Delete Organization'
				description='Are you sure you want to delete this organization? This action cannot be undone.'
				trigger={null}
				open={open}
				onOpenChange={(isOpen) => setOpen(isOpen)}
			>
				<Button onClick={handleDelete} variant='destructive' disabled={deleteOrgMutation.isPending || !user}>
					{deleteOrgMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Confirm'}
				</Button>
			</ResponsiveDialogDrawer>
		</TooltipProvider>
	)
}
