'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlusIcon, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useRequestOrg } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'

export function RequestOrgButton() {
	const [name, setName] = useState('')
	const [open, setOpen] = useState(false)
	const { data: user } = useCurrentClientUser()
	const requestOrgMutation = useRequestOrg()

	return (
		<ResponsiveDialogDrawer
			title='Request an Organization'
			description='Submit a request to create a new organization. A superadmin will review and approve it.'
			open={open}
			onOpenChange={(isOpen) => setOpen(isOpen)}
			trigger={
				<Button variant='secondary' onClick={() => setOpen(true)}>
					Request New Organization <PlusIcon className='w-4 h-4' />
				</Button>
			}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault()
					if (!user?.id) return

					requestOrgMutation.mutate(
						{ requesterId: user.id, orgName: name },
						{
							onSuccess: () => {
								setName('')
								setOpen(false)
							}
						}
					)
				}}
				className='grid gap-4 py-4'
			>
				<Label htmlFor='org-name'>Organization Name</Label>
				<Input
					id='org-name'
					placeholder='My Organization'
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
					disabled={requestOrgMutation.isPending}
				/>
				<Button type='submit' disabled={requestOrgMutation.isPending || !user}>
					{requestOrgMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Submit Request'}
				</Button>
			</form>
		</ResponsiveDialogDrawer>
	)
}
