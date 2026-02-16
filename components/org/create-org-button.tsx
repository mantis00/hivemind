'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlusIcon, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useCreateOrg } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'

export function CreateOrgButton() {
	const [name, setName] = useState('')
	const [open, setOpen] = useState(false)
	const { data: user } = useCurrentClientUser()
	const createOrgMutation = useCreateOrg()

	return (
		<ResponsiveDialogDrawer
			title='Create Organization'
			description='Enter the name of the new organization.'
			open={open}
			onOpenChange={(isOpen) => setOpen(isOpen)}
			trigger={
				<Button variant='secondary' onClick={() => setOpen(true)}>
					Create Organization <PlusIcon className='w-4 h-4' />
				</Button>
			}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault()
					if (!user?.id) return

					createOrgMutation.mutate(
						{ name, userId: user.id },
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
					disabled={createOrgMutation.isPending}
				/>
				<Button type='submit' disabled={createOrgMutation.isPending || !user}>
					{createOrgMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Create Organization'}
				</Button>
			</form>
		</ResponsiveDialogDrawer>
	)
}
