'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useSignUp } from '@/lib/react-query/auth'
import { toast } from 'sonner'

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	const [firstName, setFirstName] = useState('')
	const [lastName, setLastName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [repeatPassword, setRepeatPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [showRepeatPassword, setShowRepeatPassword] = useState(false)
	const passwordRef = useRef<HTMLInputElement>(null)
	const repeatPasswordRef = useRef<HTMLInputElement>(null)
	const mutation = useSignUp()

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

	const toggleShowRepeatPassword = () => {
		const input = repeatPasswordRef.current
		const start = input?.selectionStart ?? null
		const end = input?.selectionEnd ?? null
		setShowRepeatPassword((prev) => !prev)
		requestAnimationFrame(() => {
			if (input && start !== null && end !== null) {
				input.focus()
				input.setSelectionRange(start, end)
			}
		})
	}

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
							<div className='relative'>
								<Input
									ref={passwordRef}
									id='password'
									type={showPassword ? 'text' : 'password'}
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
								<div className='flex items-center'>
									<Label htmlFor='repeat-password'>Repeat Password</Label>
								</div>
							<div className='relative'>
								<Input
									ref={repeatPasswordRef}
									id='repeat-password'
									type={showRepeatPassword ? 'text' : 'password'}
									required
									value={repeatPassword}
									onChange={(e) => setRepeatPassword(e.target.value)}
									className='bg-background'
								/>
								<Button
									className='absolute top-0 right-0 h-full px-3 hover:bg-transparent'
									onClick={toggleShowRepeatPassword}
									onMouseDown={(e) => e.preventDefault()}
									size='icon'
									type='button'
									variant='ghost'
								>
									{showRepeatPassword ? (
										<EyeOff className='h-4 w-4 text-muted-foreground' />
									) : (
										<Eye className='h-4 w-4 text-muted-foreground' />
									)}
								</Button>
							</div>
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
