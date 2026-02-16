'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogBody,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog-to-drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlusIcon, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useInviteMember } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useParams } from 'next/navigation'

export function InviteMemberButton() {
	const params = useParams()
	const orgId = Number(params.orgId)
	const [open, setOpen] = useState(false)
	const [email, setEmail] = useState('')
	const [accessLvl, setAccessLvl] = useState('1')
	const { data: user } = useCurrentClientUser()
	const inviteMutation = useInviteMember()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!user?.id) return

		inviteMutation.mutate(
			{
				orgId,
				inviterId: user.id,
				inviteeEmail: email.trim(),
				accessLvl: parseInt(accessLvl)
			},
			{
				onSuccess: () => {
					setOpen(false)
					setEmail('')
					setAccessLvl('1')
				}
			}
		)
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant='default'>
					Invite Member <UserPlusIcon className='w-4 h-4' />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Invite Member</DialogTitle>
						<DialogDescription>
							Invite a new member to your organization. They&apos;ll receive a notification to join.
						</DialogDescription>
					</DialogHeader>
					<DialogBody>
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
										<SelectItem value='2'>Admin</SelectItem>
										<SelectItem value='3'>Owner</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</DialogBody>
					<DialogFooter>
						<DialogClose asChild>
							<Button type='button' variant='outline' disabled={inviteMutation.isPending}>
								Cancel
							</Button>
						</DialogClose>
						<Button type='submit' disabled={inviteMutation.isPending || !user}>
							{inviteMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Send Invite'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
