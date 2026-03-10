'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldCheck, Mail, KeyRound } from 'lucide-react'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { ChangeEmailButton } from '@/components/account/change-email-button'
import { ChangePasswordButton } from '@/components/account/change-password-button'

export function CredentialsSection() {
	const { data: user } = useCurrentClientUser()

	return (
		<Card>
			<CardHeader>
				<CardTitle className='flex items-center gap-2 text-base'>
					<ShieldCheck className='h-4 w-4' /> Credentials
				</CardTitle>
				<CardDescription>Manage your login credentials</CardDescription>
			</CardHeader>
			<CardContent className='grid gap-5'>
				{/* Email row */}
				<div className='flex flex-wrap items-center justify-between gap-4'>
					<div className='flex items-center gap-3 min-w-0'>
						<div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted'>
							<Mail className='h-4 w-4 text-muted-foreground' />
						</div>
						<div className='min-w-0'>
							<p className='text-sm font-medium'>Email address</p>
							<p className='text-sm text-muted-foreground truncate'>{user?.email}</p>
						</div>
					</div>
					<ChangeEmailButton />
				</div>

				<div className='border-t' />

				{/* Password row */}
				<div className='flex items-center justify-between gap-4'>
					<div className='flex items-center gap-3'>
						<div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted'>
							<KeyRound className='h-4 w-4 text-muted-foreground' />
						</div>
						<div>
							<p className='text-sm font-medium'>Password</p>
							<p className='text-sm text-muted-foreground tracking-widest'>••••••••</p>
						</div>
					</div>
					<ChangePasswordButton />
				</div>
			</CardContent>
		</Card>
	)
}
