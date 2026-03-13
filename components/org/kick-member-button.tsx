'use client'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { LoaderCircle, UserRoundX } from 'lucide-react'
import { useState } from 'react'
import { useKickMember } from '@/lib/react-query/mutations'
import { UUID } from 'crypto'
import { useParams } from 'next/navigation'

export function KickMemberButton({
	memberUserId,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange
}: {
	memberUserId: string
	open?: boolean
	onOpenChange?: (open: boolean) => void
}) {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const isControlled = controlledOpen !== undefined
	const [internalOpen, setInternalOpen] = useState(false)
	const open = isControlled ? (controlledOpen ?? false) : internalOpen
	const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen
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
				isControlled ? null : (
					<Button variant='destructive'>
						Kick Member <UserRoundX />
					</Button>
				)
			}
			open={open}
			onOpenChange={setOpen}
		>
			<form onSubmit={handleSubmit}>
				<Button type='submit' variant='destructive' className='w-full'>
					{kickMemberMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Confirm'}
				</Button>
			</form>
		</ResponsiveDialogDrawer>
	)
}
