import { Edit } from 'lucide-react'
import { ResponsiveDialogDrawer } from '../ui/dialog-to-drawer'
import { OrgSpecies, Species } from '@/lib/react-query/queries'
import { useState } from 'react'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Input } from '../ui/input'

export default function EditImageDialog({ species }: { species: OrgSpecies }) {
	const [open, setOpen] = useState(false)

	const handleSubmit = () => {}

	return (
		<ResponsiveDialogDrawer
			title={'Species Image'}
			description={'Edit the image shown for the species'}
			open={open}
			onOpenChange={(isOpen) => setOpen(isOpen)}
			trigger={
				<div className='flex flex-1 flex-row' onClick={() => setOpen(true)}>
					Edit Image <Edit className='size-4 ml-auto my-auto' />{' '}
				</div>
			}
		>
			<div className='flex flex-col gap-4 py-2'>
				<h2> Current Image for {species.custom_common_name}: </h2>
				<img src='https://dlvxxpagmtedrgwwuyxm.supabase.co/storage/v1/object/sign/species_images/mantis.jpeg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82OWYwMmFlYi0wYzVjLTRiZGItOWRjZC0zNDdkYmExYWZjOTYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzcGVjaWVzX2ltYWdlcy9tYW50aXMuanBlZyIsImlhdCI6MTc3MTg1ODQ3OCwiZXhwIjoxODAzMzk0NDc4fQ.vz7urn5rLuA_mcUEdQAN3DjR1ZBwyQA6_q7w31jR1nE ' />
			</div>
			<form onSubmit={handleSubmit}>
				<Label htmlFor='dropzone-file'>New Image</Label>
				<Input></Input>
			</form>
			<div>
				<Button variant='secondary' onClick={() => setOpen(false)}>
					Cancel
				</Button>
			</div>
		</ResponsiveDialogDrawer>
	)
}
