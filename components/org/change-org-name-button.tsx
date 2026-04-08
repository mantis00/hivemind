'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit, LoaderCircle } from 'lucide-react'
import { useChangeOrgName } from '@/lib/react-query/mutations'
import { useOrgDetails } from '@/lib/react-query/queries'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { useParams } from 'next/navigation'
import { UUID } from 'crypto'
import { toast } from 'sonner'

export function ChangeOrgNameButton() {
	const [open, setOpen] = useState(false)
	const [newName, setNewName] = useState('')
	const changeOrgName = useChangeOrgName()
	const params = useParams()
	const orgId = params?.orgId
	const { data: orgDetails } = useOrgDetails(orgId as UUID)

	const handleOpenChange = (isOpen: boolean) => {
		setOpen(isOpen)
		if (isOpen) {
			setNewName(orgDetails?.name ?? '')
		} else {
			setNewName('')
		}
	}

	return (
		<ResponsiveDialogDrawer
			title='Change Organization Name'
			description='Enter a new organization name.'
			open={open}
			onOpenChange={handleOpenChange}
			trigger={
				<Button variant='outline' size='sm' className='shrink-0'>
					<span className='hidden sm:inline'>Change Name</span> <Edit className='w-4 h-4' />
				</Button>
			}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault()
					if (orgDetails?.name === newName) {
						toast.info('No changes to save.')
						return
					}
					changeOrgName.mutate(
						{ org_id: orgId as UUID, new_name: newName },
						{
							onSuccess: () => {
								setOpen(false)
							}
						}
					)
				}}
				className='grid gap-4 py-4'
			>
				<div className='grid gap-2'>
					<Label htmlFor='new-orgname'>New Name</Label>
					<Input
						id='new-orgname'
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						placeholder='New name'
						required
						disabled={changeOrgName.isPending}
					/>
				</div>
				<Button type='submit' disabled={changeOrgName.isPending || !newName}>
					{changeOrgName.isPending ? <LoaderCircle className='animate-spin' /> : 'Update name'}
				</Button>
			</form>
		</ResponsiveDialogDrawer>
	)
}
