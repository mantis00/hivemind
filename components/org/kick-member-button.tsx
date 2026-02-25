'use client'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { LoaderCircle, UserRoundX } from 'lucide-react'
import { useState } from 'react'
import { useKickMember } from '@/lib/react-query/mutations'
import { UUID } from 'crypto'
import { useParams } from 'next/navigation'

export function KickMemberButton({ memberUserId }: { memberUserId: string }) {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const [open, setOpen] = useState(false)
	const kickMemberMutation = useKickMember()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		kickMemberMutation.mutate(
			{ orgId: orgId as UUID, userId: memberUserId },
			{
				onSuccess: () => {
					setOpen(false)
				}
			}
		)
	}

	return (
		<ResponsiveDialogDrawer
			title='Kick Member'
			description='Are you sure you want to kick this member?'
			trigger={
				<Button variant='destructive'>
					Kick Member <UserRoundX />
				</Button>
			}
			open={open}
			onOpenChange={(isOpen) => setOpen(isOpen)}
		>
			<form onSubmit={handleSubmit}>
				<Button type='submit' variant='destructive' className='w-full'>
					{kickMemberMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Confirm'}
				</Button>
			</form>
		</ResponsiveDialogDrawer>
	)
}
