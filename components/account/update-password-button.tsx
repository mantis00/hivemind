'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoaderCircle } from 'lucide-react'
import { useResestPassword } from '@/lib/react-query/auth'

export function UpdatePasswordButton() {
	const [open, setOpen] = useState(false)
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const resetPassword = useResestPassword()

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (password !== confirmPassword) return
		resetPassword.mutate(
			{ password },
			{
				onSuccess: () => {
					setOpen(false)
					setPassword('')
					setConfirmPassword('')
				}
			}
		)
	}

	const passwordsMatch = password === confirmPassword

	return (
		<ResponsiveDialogDrawer
			title='Reset your password'
			description='Enter a new password for your account.'
			trigger={<Button className='w-fit'>Update password</Button>}
			open={open}
			onOpenChange={(isOpen) => setOpen(isOpen)}
		>
			<form onSubmit={handleSubmit}>
				<div className='grid gap-4 py-4'>
					<div className='grid gap-2'>
						<Label htmlFor='password'>New password</Label>
						<Input
							id='password'
							type='password'
							placeholder='New password'
							required
							disabled={resetPassword.isPending}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
					</div>
					<div className='grid gap-2'>
						<Label htmlFor='confirm-password'>Confirm new password</Label>
						<Input
							id='confirm-password'
							type='password'
							placeholder='Confirm new password'
							required
							disabled={resetPassword.isPending}
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
						/>
						{confirmPassword.length > 0 && !passwordsMatch && (
							<p className='text-sm text-destructive'>Passwords do not match.</p>
						)}
					</div>
				</div>
				<div className='flex justify-end space-x-2'>
					<Button type='submit' disabled={resetPassword.isPending || !passwordsMatch} className='w-full'>
						{resetPassword.isPending ? <LoaderCircle className='animate-spin' /> : 'Save new password'}
					</Button>
				</div>
			</form>
		</ResponsiveDialogDrawer>
	)
}
