'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoaderCircle } from 'lucide-react'
import { useUpdateEmail, useCurrentClientUser } from '@/lib/react-query/auth'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'

export function ChangeEmailButton() {
	const [open, setOpen] = useState(false)
	const [newEmail, setNewEmail] = useState('')
	const updateEmail = useUpdateEmail()
	const { data: user } = useCurrentClientUser()

	const isSameEmail = !!newEmail && newEmail.trim().toLowerCase() === user?.email?.toLowerCase()

	return (
		<ResponsiveDialogDrawer
			title='Change Email'
			description='Enter your new email address. A confirmation link will be sent to BOTH email addresses. You must verify both to complete the change.'
			open={open}
			onOpenChange={(isOpen) => {
				setOpen(isOpen)
				if (!isOpen) setNewEmail('')
			}}
			trigger={
				<Button variant='outline' size='sm' className='shrink-0'>
					Change
				</Button>
			}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault()
					if (isSameEmail) return
					updateEmail.mutate(
						{ email: newEmail },
						{
							onSuccess: () => {
								setOpen(false)
								setNewEmail('')
							}
						}
					)
				}}
				className='grid gap-4 py-4'
			>
				<div className='grid gap-2'>
					<Label htmlFor='new-email'>New email address</Label>
					<Input
						id='new-email'
						type='email'
						value={newEmail}
						onChange={(e) => setNewEmail(e.target.value)}
						placeholder='name@example.com'
						required
						disabled={updateEmail.isPending}
					/>
					{isSameEmail && <p className='text-sm text-destructive'>This is already your current email address.</p>}
				</div>
				<Button type='submit' disabled={updateEmail.isPending || !newEmail || isSameEmail}>
					{updateEmail.isPending ? <LoaderCircle className='animate-spin' /> : 'Send confirmation'}
				</Button>
			</form>
		</ResponsiveDialogDrawer>
	)
}
