'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useResestPassword } from '@/lib/react-query/auth'

export function UpdatePasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const passwordRef = useRef<HTMLInputElement>(null)
	const confirmPasswordRef = useRef<HTMLInputElement>(null)
	const router = useRouter()
	const resetPassword = useResestPassword()

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

	const handleUpdatePassword = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!passwordsMatch) return
		resetPassword.mutate(
			{ password },
			{
				onSuccess: () => {
					router.push('/protected')
				}
			}
		)
	}

	return (
		<div className={cn('flex flex-col gap-6', className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle className='text-2xl'>Reset Your Password</CardTitle>
					<CardDescription>Please enter your new password below.</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleUpdatePassword}>
						<div className='flex flex-col gap-6'>
							<div className='grid gap-2'>
								<Label htmlFor='password'>New password</Label>
								<div className='relative'>
									<Input
										ref={passwordRef}
										id='password'
										type={showPassword ? 'text' : 'password'}
										placeholder='New password'
										required
										value={password}
										onChange={(e) => setPassword(e.target.value)}
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
										placeholder='Confirm new password'
										required
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										className={cn(
											'bg-background',
											passwordError && 'border-destructive focus-visible:ring-destructive'
										)}
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
								{passwordError && <p className='text-sm text-destructive'>Passwords do not match.</p>}
							</div>
							<Button type='submit' className='w-full' disabled={resetPassword.isPending}>
								{resetPassword.isPending ? 'Saving...' : 'Save new password'}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
