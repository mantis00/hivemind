'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { useLogin } from '@/lib/react-query/auth'

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const mutation = useLogin()

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault()
		mutation.mutate({ email, password })
	}

	return (
		<div className={cn('flex flex-col gap-6', className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle className='text-2xl'>Login</CardTitle>
					<CardDescription>Enter your email below to login to your account</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleLogin}>
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
							<div className='grid gap-2'>
								<div className='flex items-center'>
									<Label htmlFor='password'>Password</Label>
									<Link
										href='/auth/forgot-password'
										className='ml-auto inline-block text-sm underline-offset-4 hover:underline'
									>
										Forgot your password?
									</Link>
								</div>
								<Input
									id='password'
									type='password'
									required
									value={password}
									onChange={(e) => setPassword(e.target.value)}
								/>
							</div>
							<Button type='submit' className='w-full' disabled={mutation.isPending || mutation.isSuccess}>
								{mutation.isPending || mutation.isSuccess ? (
									<>
										<LoaderCircle className='animate-spin' />
										Logging in...
									</>
								) : (
									'Login'
								)}
							</Button>
						</div>
						<div className='mt-4 text-center text-sm'>
							Don&apos;t have an account?{' '}
							<Link href='/auth/sign-up' className='underline underline-offset-4'>
								Sign up
							</Link>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
