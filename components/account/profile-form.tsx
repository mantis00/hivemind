'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoaderCircle, User } from 'lucide-react'
import { useCurrentUserProfile } from '@/lib/react-query/queries'
import { useUpdateProfile } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'

export function ProfileForm() {
	const { data: user } = useCurrentClientUser()
	const { data: profile, isLoading } = useCurrentUserProfile()
	const updateProfile = useUpdateProfile()

	const [firstName, setFirstName] = useState<string | null>(null)
	const [lastName, setLastName] = useState<string | null>(null)

	const displayFirst = firstName ?? profile?.first_name ?? ''
	const displayLast = lastName ?? profile?.last_name ?? ''

	const isDirty =
		profile &&
		((firstName !== null && firstName !== profile.first_name) || (lastName !== null && lastName !== profile.last_name))

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!user?.id) return
		updateProfile.mutate({ userId: user.id, firstName: displayFirst, lastName: displayLast })
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className='flex items-center gap-2 text-base'>
					<User className='h-4 w-4' /> Personal Information
				</CardTitle>
				<CardDescription>Update your display name</CardDescription>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<LoaderCircle className='animate-spin text-muted-foreground' />
				) : (
					<form onSubmit={handleSubmit} className='grid gap-4'>
						<div className='grid sm:grid-cols-2 gap-4'>
							<div className='grid gap-2'>
								<Label htmlFor='first-name'>First name</Label>
								<Input
									id='first-name'
									value={displayFirst}
									onChange={(e) => setFirstName(e.target.value)}
									placeholder='First name'
									disabled={updateProfile.isPending}
								/>
							</div>
							<div className='grid gap-2'>
								<Label htmlFor='last-name'>Last name</Label>
								<Input
									id='last-name'
									value={displayLast}
									onChange={(e) => setLastName(e.target.value)}
									placeholder='Last name'
									disabled={updateProfile.isPending}
								/>
							</div>
						</div>
						<Button type='submit' disabled={!isDirty || updateProfile.isPending} className='w-fit'>
							{updateProfile.isPending ? <LoaderCircle className='animate-spin' /> : 'Save changes'}
						</Button>
					</form>
				)}
			</CardContent>
		</Card>
	)
}
