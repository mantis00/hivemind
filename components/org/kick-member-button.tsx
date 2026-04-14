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
					<Button variant='destructive' size='sm' className='h-7 px-2 gap-1 text-xs'>
						Kick Member <UserRoundX className='w-3 h-3' />
					</Button>
				)
			}
			open={open}
			onOpenChange={setOpen}
		>
			<form onSubmit={handleSubmit}>
				<div className='py-2' />
				<div className='flex justify-end gap-2'>
					<Button
						type='button'
						variant='outline'
						disabled={kickMemberMutation.isPending}
						onClick={() => setOpen(false)}
					>
						Cancel
					</Button>
					<Button type='submit' variant='destructive' disabled={kickMemberMutation.isPending}>
						{kickMemberMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Confirm'}
					</Button>
				</div>
			</form>
		</ResponsiveDialogDrawer>
	)
}
