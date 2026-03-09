'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { useSignUp } from '@/lib/react-query/auth'
import { toast } from 'sonner'

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	const [firstName, setFirstName] = useState('')
	const [lastName, setLastName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [repeatPassword, setRepeatPassword] = useState('')
	const mutation = useSignUp()

	const handleSignUp = async (e: React.FormEvent) => {
		e.preventDefault()
		if (password !== repeatPassword) {
			toast.error('Passwords do not match!')
			return
		}
		mutation.mutate({ email, password, firstName, lastName })
	}

	return (
		<div className={cn('flex flex-col gap-6', className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle className='text-2xl'>Sign up</CardTitle>
					<CardDescription>Create a new account</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSignUp}>
						<div className='flex flex-col gap-6'>
							<div className='grid gap-2'>
								<Label htmlFor='first-name'>First Name</Label>
								<Input
									id='first-name'
									type='text'
									placeholder='John'
									required
									value={firstName}
									onChange={(e) => setFirstName(e.target.value)}
								/>
							</div>
							<div className='grid gap-2'>
								<Label htmlFor='last-name'>Last Name</Label>
								<Input
									id='last-name'
									type='text'
									placeholder='Doe'
									required
									value={lastName}
									onChange={(e) => setLastName(e.target.value)}
								/>
							</div>
							<div className='grid gap-2'>
								<Label htmlFor='email'>Email</Label>
								<Input
									id='email'
									type='email'
									placeholder='mail@example.com'
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
								/>
							</div>
							<div className='grid gap-2'>
								<div className='flex items-center'>
									<Label htmlFor='password'>Password</Label>
								</div>
								<Input
									id='password'
									type='password'
									required
									value={password}
									onChange={(e) => setPassword(e.target.value)}
								/>
							</div>
							<div className='grid gap-2'>
								<div className='flex items-center'>
									<Label htmlFor='repeat-password'>Repeat Password</Label>
								</div>
								<Input
									id='repeat-password'
									type='password'
									required
									value={repeatPassword}
									onChange={(e) => setRepeatPassword(e.target.value)}
								/>
							</div>
							<Button type='submit' className='w-full' disabled={mutation.isPending || mutation.isSuccess}>
								{mutation.isPending || mutation.isSuccess ? (
									<>
										<LoaderCircle className='animate-spin' />
										Creating account...
									</>
								) : (
									'Sign up'
								)}
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
		</div>
	)
}
