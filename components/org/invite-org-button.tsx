'use client'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlusIcon, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useInviteMember } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useParams } from 'next/navigation'
import { UUID } from 'crypto'
import { useIsOwnerOrSuperadmin } from '@/lib/react-query/queries'

export function InviteMemberButton() {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const [open, setOpen] = useState(false)
	const [email, setEmail] = useState('')
	const [accessLvl, setAccessLvl] = useState('1')
	const { data: user } = useCurrentClientUser()
	const inviteMutation = useInviteMember()
	const isOwnerOrSuperadmin = useIsOwnerOrSuperadmin(orgId)

	if (!isOwnerOrSuperadmin) return null

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!user?.id) return

		inviteMutation.mutate(
			{
				orgId: orgId as UUID,
				inviterId: user.id,
				inviteeEmail: email,
				accessLvl: Number(accessLvl)
			},
			{
				onSuccess: () => {
					setEmail('')
					setOpen(false)
					setAccessLvl('1')
				}
			}
		)
	}

	return (
		<ResponsiveDialogDrawer
			title='Invite Member'
			description='Enter the email and access level for the new member.'
			trigger={
				<Button variant='default'>
					Invite Member <UserPlusIcon className='w-4 h-4' />
				</Button>
			}
			open={open}
			onOpenChange={(isOpen) => setOpen(isOpen)}
		>
			<form onSubmit={handleSubmit}>
				<div className='grid gap-4 py-4'>
					<div className='grid gap-2'>
						<Label htmlFor='email'>Email Address</Label>
						<Input
							id='email'
							type='email'
							placeholder='user@example.com'
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							disabled={inviteMutation.isPending}
						/>
					</div>
					<div className='grid gap-2'>
						<Label htmlFor='access-level'>Access Level</Label>
						<Select value={accessLvl} onValueChange={setAccessLvl} disabled={inviteMutation.isPending}>
							<SelectTrigger id='access-level'>
								<SelectValue placeholder='Select access level' />
							</SelectTrigger>
							<SelectContent position='popper' side='bottom' align='start'>
								<SelectItem value='1'>Caretaker</SelectItem>
								<SelectItem value='2'>Owner</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
				<Button type='submit' className='w-full' disabled={inviteMutation.isPending || !user}>
					{inviteMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Send Invite'}
				</Button>
			</form>
		</ResponsiveDialogDrawer>
	)
}
