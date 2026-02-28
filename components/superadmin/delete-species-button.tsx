'use client'

import { useState } from 'react'
import { useDeleteSpecies } from '@/lib/react-query/mutations'
import { Button } from '@/components/ui/button'
import { LoaderCircle, TrashIcon } from 'lucide-react'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { UUID } from 'crypto'

export function DeleteSpeciesButton({ species_id, onDeleted }: { species_id: UUID; onDeleted?: () => void }) {
	const [open, setOpen] = useState(false)
	const deleteSpecies = useDeleteSpecies()

	const handleDelete = () => {
		deleteSpecies.mutate(
			{ species_id },
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
			description='Are you sure you want to delete this species? This action cannot be undone.'
			open={open}
			onOpenChange={setOpen}
			trigger={
				<Button type='button' variant='destructive'>
					<TrashIcon /> Delete Species
				</Button>
			}
		>
			<Button onClick={handleDelete} variant='destructive' disabled={deleteSpecies.isPending}>
				{deleteSpecies.isPending ? <LoaderCircle className='animate-spin' /> : 'Confirm'}
			</Button>
		</ResponsiveDialogDrawer>
	)
}
