'use client'
import { Button } from '@/components/ui/button'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useDeleteEnclosure } from '@/lib/react-query/mutations'
import { LoaderCircle, TrashIcon } from 'lucide-react'
import { ResponsiveDialogDrawer } from '../ui/dialog-to-drawer'

export default function DeleteEnclosureButton({
	enclosure_id,
	onDeleted
}: {
	enclosure_id: number
	onDeleted?: () => void
}) {
	const [open, setOpen] = useState(false)
	const params = useParams()
	const orgId = params?.orgId as number | undefined
	const deleteEnclosureMutation = useDeleteEnclosure()

	const handleDelete = async () => {
		deleteEnclosureMutation.mutate(
			{ id: enclosure_id as number, orgId: orgId as number },
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
			title='Delete Enclosure'
			description='Are you sure you want to delete this enclosure? This action cannot be undone.'
			open={open}
			onOpenChange={(isOpen) => setOpen(isOpen)}
			trigger={
				<Button variant='destructive'>
					<TrashIcon /> Delete Enclosure
				</Button>
			}
		>
			<Button onClick={handleDelete} variant='destructive' disabled={deleteEnclosureMutation.isPending}>
				{deleteEnclosureMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Confirm'}
			</Button>
		</ResponsiveDialogDrawer>
	)
}
