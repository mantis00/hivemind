'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useState } from 'react'
import { useForgotPassword } from '@/lib/react-query/auth'

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	const [email, setEmail] = useState('')
	const mutation = useForgotPassword()

	const handleForgotPassword = async (e: React.FormEvent) => {
		e.preventDefault()
		mutation.mutate({ email })
	}

	return (
		<div className={cn('flex flex-col gap-6', className)} {...props}>
			{mutation.isSuccess ? (
				<Card>
					<CardHeader>
						<CardTitle className='text-2xl'>Check Your Email</CardTitle>
						<CardDescription>Password reset instructions sent</CardDescription>
					</CardHeader>
					<CardContent>
						<p className='text-sm text-muted-foreground'>
							If you registered using your email and password, you will receive a password reset email.
						</p>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader>
						<CardTitle className='text-2xl'>Reset Your Password</CardTitle>
						<CardDescription>Type in your email and we&apos;ll send you a link to reset your password</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleForgotPassword}>
							<div className='flex flex-col gap-6'>
								<div className='grid gap-2'>
									<Label htmlFor='email'>Email</Label>
									<Input
										id='email'
										type='email'
										placeholder='email@example.com'
										required
										value={email}
										onChange={(e) => setEmail(e.target.value)}
									/>
								</div>
								<Button type='submit' className='w-full' disabled={mutation.isPending}>
									{mutation.isPending ? 'Sending...' : 'Send reset email'}
								</Button>
							</div>
							<div className='mt-4 text-center text-sm'>
								Already have an account?{' '}
								<Link href='/auth/login' className='underline underline-offset-4'>
									Login
								</Link>
							</div>
						</form>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
