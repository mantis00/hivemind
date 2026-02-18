'use client'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogBody,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog-to-drawer'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useDeleteEnclosure } from '@/lib/react-query/mutations'
import { LoaderCircle, TrashIcon } from 'lucide-react'

export default function DeleteEnclosureButton({ enclosure_id }: { enclosure_id: number }) {
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
				}
			}
		)
	}

	return (
		<>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild className='mr-auto'>
					<Button variant='ghost'>
						<TrashIcon />
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Enclosure</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this enclosure? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogBody>
						<div className='py-2' />
					</DialogBody>
					<DialogClose asChild>
						<Button type='button' variant='outline' disabled={deleteEnclosureMutation.isPending}>
							Cancel
						</Button>
					</DialogClose>
					<Button
						type='button'
						variant='destructive'
						onClick={handleDelete}
						disabled={deleteEnclosureMutation.isPending}
					>
						{deleteEnclosureMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Delete Enclosure'}
					</Button>
				</DialogContent>
			</Dialog>
		</>
	)
}
