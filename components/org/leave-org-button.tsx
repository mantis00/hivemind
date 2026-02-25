'use client'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { LoaderCircle, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useLeaveOrg } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { UUID } from 'crypto'
import { useParams } from 'next/navigation'

export function LeaveOrgButton() {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const [open, setOpen] = useState(false)
	const { data: user } = useCurrentClientUser()
	const leaveOrgMutation = useLeaveOrg()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!user?.id) return

		leaveOrgMutation.mutate(
			{ orgId: orgId as UUID, userId: user.id },
			{
				onSuccess: () => {
					setOpen(false)
				}
			}
		)
	}

	return (
		<ResponsiveDialogDrawer
			title='Leave Organization'
			description='Are you sure you want to leave this organization? This action cannot be undone.'
			trigger={
				<Button variant='destructive'>
					Leave Organization <LogOut />
				</Button>
			}
			open={open}
			onOpenChange={(isOpen) => setOpen(isOpen)}
		>
			<form onSubmit={handleSubmit}>
				<div className='py-2' />
				<div className='flex justify-end gap-2'>
					<Button type='button' variant='outline' disabled={leaveOrgMutation.isPending} onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button type='submit' variant='destructive' disabled={leaveOrgMutation.isPending || !user || !orgId}>
						{leaveOrgMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Leave Organization'}
					</Button>
				</div>
			</form>
		</ResponsiveDialogDrawer>
	)
}
