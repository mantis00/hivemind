'use client'

import { useState } from 'react'
import { LoaderCircle, TrashIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { useDeleteTaskTemplate } from '@/lib/react-query/mutations'
import type { Species, TaskTemplate } from '@/lib/react-query/queries'

interface DeleteTemplateButtonProps {
	template: TaskTemplate
	species: Species
}

export function DeleteTemplateButton({ template, species }: DeleteTemplateButtonProps) {
	const [open, setOpen] = useState(false)
	const deleteTemplate = useDeleteTaskTemplate()

	const handleDelete = () => {
		deleteTemplate.mutate(
			{ templateId: template.id, speciesId: species.id },
			{
				onSuccess: () => setOpen(false),
				onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete template')
			}
		)
	}

	return (
		<ResponsiveDialogDrawer
			title='Delete Task Template'
			description={`Are you sure you want to delete the "${template.type}" template? This action cannot be undone.`}
			trigger={
				<Button type='button' variant='destructive' size='xs'>
					Delete template
					<TrashIcon className='h-3 w-3' />
				</Button>
			}
			open={open}
			onOpenChange={setOpen}
		>
			<Button variant='destructive' size='sm' onClick={handleDelete} disabled={deleteTemplate.isPending}>
				{deleteTemplate.isPending ? <LoaderCircle className='h-3.5 w-3.5 animate-spin' /> : 'Delete'}
			</Button>
		</ResponsiveDialogDrawer>
	)
}
