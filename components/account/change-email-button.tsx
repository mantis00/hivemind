'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoaderCircle } from 'lucide-react'
import { useUpdateEmail } from '@/lib/react-query/auth'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'

export function ChangeEmailButton() {
	const [open, setOpen] = useState(false)
	const [newEmail, setNewEmail] = useState('')
	const updateEmail = useUpdateEmail()

	return (
		<ResponsiveDialogDrawer
			title='Change Email'
			description='Enter your new email address. A confirmation link will be sent to verify it before the change takes effect.'
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
				</div>
				<Button type='submit' disabled={updateEmail.isPending || !newEmail}>
					{updateEmail.isPending ? <LoaderCircle className='animate-spin' /> : 'Send confirmation'}
				</Button>
			</form>
		</ResponsiveDialogDrawer>
	)
}
