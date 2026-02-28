'use client'

import { useState } from 'react'
import { useDeleteSpeciesFromOrg } from '@/lib/react-query/mutations'
import { Button } from '@/components/ui/button'
import { LoaderCircle, TrashIcon } from 'lucide-react'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { UUID } from 'crypto'
import { useParams } from 'next/navigation'

export function DeleteSpeciesOrgButton({ species_id, onDeleted }: { species_id: UUID; onDeleted?: () => void }) {
	const [open, setOpen] = useState(false)
	const deleteSpecies = useDeleteSpeciesFromOrg()
	const params = useParams()
	const orgId = params?.orgId

	const handleDelete = () => {
		deleteSpecies.mutate(
			{ species_id, orgId: orgId as UUID },
			{
				onSuccess: () => {
					setOpen(false)
					onDeleted?.()
				}
			}
		)
	}

	return (
		<ResponsiveDialogDrawer
			title='Delete Species'
			description='Are you sure you want to remove this species? All enclosures, enclosure notes and tasks associated with this species will also be removed. This action cannot be undone.'
			open={open}
			onOpenChange={setOpen}
			trigger={
				<Button type='button' variant='destructive'>
					<TrashIcon /> Remove Species
				</Button>
			}
		>
			<Button onClick={handleDelete} variant='destructive' disabled={deleteSpecies.isPending}>
				{deleteSpecies.isPending ? <LoaderCircle className='animate-spin' /> : 'Confirm'}
			</Button>
		</ResponsiveDialogDrawer>
	)
}
