'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoaderCircle } from 'lucide-react'
import { useResestPassword } from '@/lib/react-query/auth'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { cn } from '@/lib/utils'

export function ChangePasswordButton() {
	const [open, setOpen] = useState(false)
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const resetPassword = useResestPassword()

	const passwordsMatch = password === confirmPassword
	const passwordError = password && confirmPassword && !passwordsMatch

	const handleOpenChange = (isOpen: boolean) => {
		setOpen(isOpen)
		if (!isOpen) {
			setPassword('')
			setConfirmPassword('')
		}
	}

	return (
		<ResponsiveDialogDrawer
			title='Change Password'
			description='Enter a new password for your account.'
			open={open}
			onOpenChange={handleOpenChange}
			trigger={
				<Button variant='outline' size='sm' className='shrink-0'>
					Change
				</Button>
			}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault()
					if (!passwordsMatch) return
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
				}}
				className='grid gap-4 py-4'
			>
				<div className='grid gap-2'>
					<Label htmlFor='new-password'>New password</Label>
					<Input
						id='new-password'
						type='password'
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder='New password'
						required
						disabled={resetPassword.isPending}
					/>
				</div>
				<div className='grid gap-2'>
					<Label htmlFor='confirm-password'>Confirm new password</Label>
					<Input
						id='confirm-password'
						type='password'
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						placeholder='Confirm password'
						required
						disabled={resetPassword.isPending}
						className={cn(passwordError && 'border-destructive focus-visible:ring-destructive')}
					/>
				</div>
				{passwordError && <p className='text-xs text-destructive'>Passwords do not match</p>}
				<Button type='submit' disabled={resetPassword.isPending || !password || !confirmPassword || !passwordsMatch}>
					{resetPassword.isPending ? <LoaderCircle className='animate-spin' /> : 'Update password'}
				</Button>
			</form>
		</ResponsiveDialogDrawer>
	)
}
