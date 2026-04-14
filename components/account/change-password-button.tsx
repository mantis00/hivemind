'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useChangePassword } from '@/lib/react-query/auth'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { cn } from '@/lib/utils'

export function ChangePasswordButton() {
	const [open, setOpen] = useState(false)
	const [currentPassword, setCurrentPassword] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [showCurrentPassword, setShowCurrentPassword] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const currentPasswordRef = useRef<HTMLInputElement>(null)
	const passwordRef = useRef<HTMLInputElement>(null)
	const confirmPasswordRef = useRef<HTMLInputElement>(null)
	const resetPassword = useChangePassword()

	const toggleShowCurrentPassword = () => {
		const input = currentPasswordRef.current
		const start = input?.selectionStart ?? null
		const end = input?.selectionEnd ?? null
		setShowCurrentPassword((prev) => !prev)
		requestAnimationFrame(() => {
			if (input && start !== null && end !== null) {
				input.focus()
				input.setSelectionRange(start, end)
			}
		})
	}

	const toggleShowPassword = () => {
		const input = passwordRef.current
		const start = input?.selectionStart ?? null
		const end = input?.selectionEnd ?? null
		setShowPassword((prev) => !prev)
		requestAnimationFrame(() => {
			if (input && start !== null && end !== null) {
				input.focus()
				input.setSelectionRange(start, end)
			}
		})
	}

	const toggleShowConfirmPassword = () => {
		const input = confirmPasswordRef.current
		const start = input?.selectionStart ?? null
		const end = input?.selectionEnd ?? null
		setShowConfirmPassword((prev) => !prev)
		requestAnimationFrame(() => {
			if (input && start !== null && end !== null) {
				input.focus()
				input.setSelectionRange(start, end)
			}
		})
	}

	const passwordsMatch = password === confirmPassword
	const passwordError = password && confirmPassword && !passwordsMatch

	const handleOpenChange = (isOpen: boolean) => {
		setOpen(isOpen)
		if (!isOpen) {
			setCurrentPassword('')
			setPassword('')
			setConfirmPassword('')
			setShowCurrentPassword(false)
			setShowPassword(false)
			setShowConfirmPassword(false)
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
						{ currentPassword, password },
						{
							onSuccess: () => {
								setOpen(false)
								setCurrentPassword('')
								setPassword('')
								setConfirmPassword('')
								setShowCurrentPassword(false)
								setShowPassword(false)
								setShowConfirmPassword(false)
							}
						}
					)
				}}
				className='grid gap-4 py-4'
			>
				<div className='grid gap-2'>
					<Label htmlFor='current-password'>Current password</Label>
					<div className='relative'>
						<Input
							ref={currentPasswordRef}
							id='current-password'
							type={showCurrentPassword ? 'text' : 'password'}
							value={currentPassword}
							onChange={(e) => setCurrentPassword(e.target.value)}
							placeholder='Current password'
							required
							disabled={resetPassword.isPending}
							className='bg-background'
						/>
						<Button
							className='absolute top-0 right-0 h-full px-3 hover:bg-transparent'
							onClick={toggleShowCurrentPassword}
							onMouseDown={(e) => e.preventDefault()}
							size='icon'
							type='button'
							variant='ghost'
							disabled={resetPassword.isPending}
						>
							{showCurrentPassword ? (
								<EyeOff className='h-4 w-4 text-muted-foreground' />
							) : (
								<Eye className='h-4 w-4 text-muted-foreground' />
							)}
						</Button>
					</div>
				</div>
				<div className='grid gap-2'>
					<Label htmlFor='new-password'>New password</Label>
					<div className='relative'>
						<Input
							ref={passwordRef}
							id='new-password'
							type={showPassword ? 'text' : 'password'}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder='New password'
							required
							disabled={resetPassword.isPending}
							className='bg-background'
						/>
						<Button
							className='absolute top-0 right-0 h-full px-3 hover:bg-transparent'
							onClick={toggleShowPassword}
							onMouseDown={(e) => e.preventDefault()}
							size='icon'
							type='button'
							variant='ghost'
							disabled={resetPassword.isPending}
						>
							{showPassword ? (
								<EyeOff className='h-4 w-4 text-muted-foreground' />
							) : (
								<Eye className='h-4 w-4 text-muted-foreground' />
							)}
						</Button>
					</div>
				</div>
				<div className='grid gap-2'>
					<Label htmlFor='confirm-password'>Confirm new password</Label>
					<div className='relative'>
						<Input
							ref={confirmPasswordRef}
							id='confirm-password'
							type={showConfirmPassword ? 'text' : 'password'}
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							placeholder='Confirm password'
							required
							disabled={resetPassword.isPending}
							className={cn('bg-background', passwordError && 'border-destructive focus-visible:ring-destructive')}
						/>
						<Button
							className='absolute top-0 right-0 h-full px-3 hover:bg-transparent'
							onClick={toggleShowConfirmPassword}
							onMouseDown={(e) => e.preventDefault()}
							size='icon'
							type='button'
							variant='ghost'
							disabled={resetPassword.isPending}
						>
							{showConfirmPassword ? (
								<EyeOff className='h-4 w-4 text-muted-foreground' />
							) : (
								<Eye className='h-4 w-4 text-muted-foreground' />
							)}
						</Button>
					</div>
				</div>
				{passwordError && <p className='text-xs text-destructive'>Passwords do not match</p>}
				{resetPassword.error && <p className='text-xs text-destructive'>{resetPassword.error.message}</p>}
				<Button
					type='submit'
					disabled={resetPassword.isPending || !currentPassword || !password || !confirmPassword || !passwordsMatch}
				>
					{resetPassword.isPending ? <LoaderCircle className='animate-spin' /> : 'Update password'}
				</Button>
			</form>
		</ResponsiveDialogDrawer>
	)
}
