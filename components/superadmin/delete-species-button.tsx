'use client'

import { useState } from 'react'
import { useDeleteSpecies } from '@/lib/react-query/mutations'
import { useIsSpeciesInUse } from '@/lib/react-query/queries'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { LoaderCircle, TrashIcon } from 'lucide-react'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { UUID } from 'crypto'

export function DeleteSpeciesButton({ species_id, onDeleted }: { species_id: UUID; onDeleted?: () => void }) {
	const [open, setOpen] = useState(false)
	const deleteSpecies = useDeleteSpecies()
	const { data: isInUse } = useIsSpeciesInUse(species_id)

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

	const triggerButton = (
		<Button type='button' variant='destructive' disabled={!!isInUse}>
			<TrashIcon /> Delete Species
		</Button>
	)

	return (
		<>
			{isInUse ? (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<span tabIndex={0}>{triggerButton}</span>
						</TooltipTrigger>
						<TooltipContent>This species is used by one or more organizations and cannot be deleted.</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			) : (
				<ResponsiveDialogDrawer
					title='Delete Species'
					description='Are you sure you want to delete this species? This action cannot be undone.'
					open={open}
					onOpenChange={setOpen}
					trigger={triggerButton}
				>
					<Button onClick={handleDelete} variant='destructive' disabled={deleteSpecies.isPending}>
						{deleteSpecies.isPending ? <LoaderCircle className='animate-spin' /> : 'Confirm'}
					</Button>
				</ResponsiveDialogDrawer>
			)}
		</>
	)
}
