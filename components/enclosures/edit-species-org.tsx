'use client'

import { useEffect, useState } from 'react'
import { type OrgSpecies } from '@/lib/react-query/queries'
import { useUpdateOrgSpecies, useUpdateSpecies, useUpdateSpeciesImage } from '@/lib/react-query/mutations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Edit, LoaderCircle } from 'lucide-react'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { createClient } from '@/lib/supabase/client'
import { DeleteSpeciesOrgButton } from './delete-species-org'
import { useParams } from 'next/navigation'
import { UUID } from 'crypto'
import { User } from '@supabase/supabase-js'

interface EditSpeciesDialogProps {
	species: OrgSpecies
	open: boolean
	onOpenChange: (open: boolean) => void
}

interface EditSpeciesFormProps {
	species: OrgSpecies
	onDone: () => void
	onDeleted: () => void
}

export function EditSpeciesOrgForm({ species, onDone, onDeleted }: EditSpeciesFormProps) {
	const [commonName, setCommonName] = useState(species.custom_common_name)
	const [careInstructions, setCareInstructions] = useState(species.custom_care_instructions ?? '')
	const updateSpecies = useUpdateOrgSpecies()
	const params = useParams()
	const orgId = params?.orgId

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		onDone() // switch view back immediately before async invalidation re-renders the parent
		updateSpecies.mutate({
			species_id: species.id,
			custom_common_name: commonName,
			custom_care_instructions: careInstructions,
			org_id: orgId as UUID
		})
	}

	return (
		<form onSubmit={handleSubmit} className='flex flex-col gap-4 overflow-y-auto px-1'>
			<div className='grid gap-3'>
				<div className='flex flex-col gap-1.5'>
					<Label htmlFor='edit_common_name'>Common Name</Label>
					<Input
						id='edit_common_name'
						value={commonName}
						onChange={(e) => setCommonName(e.target.value)}
						disabled={updateSpecies.isPending}
						required
					/>
				</div>
				<div className='flex flex-col gap-1.5'>
					<Label htmlFor='edit_care'>Care Instructions</Label>
					<Textarea
						id='edit_care'
						value={careInstructions}
						onChange={(e) => setCareInstructions(e.target.value)}
						disabled={updateSpecies.isPending}
						rows={4}
						placeholder='Enter care instructions…'
					/>
				</div>
			</div>
			<div className='flex gap-2'>
				<DeleteSpeciesOrgButton species_id={species.id} onDeleted={onDeleted} />
				<div className='flex gap-2 ml-auto'>
					<Button type='button' variant='outline' onClick={onDone} disabled={updateSpecies.isPending}>
						Cancel
					</Button>
					<Button type='submit' disabled={updateSpecies.isPending}>
						{updateSpecies.isPending ? <LoaderCircle className='h-4 w-4 animate-spin' /> : 'Save Changes'}
					</Button>
				</div>
			</div>
		</form>
	)
}

export function EditSpeciesOrgButton({ species, open, onOpenChange }: EditSpeciesDialogProps) {
	const [commonName, setCommonName] = useState(species.custom_common_name)
	const [careInstructions, setCareInstructions] = useState(species.custom_care_instructions ?? '')
	const updateSpecies = useUpdateOrgSpecies()

	const params = useParams()
	const orgId = params?.orgId
	// const [user, setUser] = useState<User | null>(null)

	// const supabase = createClient()

	// useEffect(() => {
	// 		const fetchUser = async () => {
	// 			const {
	// 				data: { user }
	// 			} = await supabase.auth.getUser()
	// 			setUser(user)
	// 		}

	// 		fetchUser()
	// 	}, [])

	const resetForm = () => {
		setCommonName(species.custom_common_name)
		setCareInstructions(species.custom_care_instructions ?? '')
	}

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) resetForm()
		onOpenChange(isOpen)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		updateSpecies.mutate({
			species_id: species.id,
			custom_common_name: commonName,
			custom_care_instructions: careInstructions,
			org_id: orgId as UUID
		})

		handleOpenChange(false)
	}

	const isPending = updateSpecies.isPending

	return (
		<ResponsiveDialogDrawer
			title={`Edit: ${species.custom_common_name} (${species.species.scientific_name})`}
			description='Scientific name and picture cannot be changed'
			open={open}
			onOpenChange={handleOpenChange}
			trigger={
				<Button variant='ghost'>
					<Edit className='h-4 w-4 ml-auto' /> Edit
				</Button>
			}
		>
			<form onSubmit={handleSubmit} className='flex flex-col gap-4 overflow-y-auto px-1'>
				<div className='grid gap-3'>
					<div className='flex flex-col gap-1.5'>
						<Label htmlFor='edit_common_name'>Common Name</Label>
						<Input
							id='edit_common_name'
							value={commonName}
							onChange={(e) => setCommonName(e.target.value)}
							disabled={isPending}
							required
						/>
					</div>
					<div className='flex flex-col gap-1.5'>
						<Label htmlFor='edit_care'>Care Instructions</Label>
						<Textarea
							id='edit_care'
							value={careInstructions}
							onChange={(e) => setCareInstructions(e.target.value)}
							disabled={isPending}
							rows={4}
							placeholder='Enter care instructions…'
						/>
					</div>
				</div>
				<div className='flex gap-2'>
					<DeleteSpeciesOrgButton species_id={species.id} onDeleted={() => handleOpenChange(false)} />
					<div className='flex gap-2 ml-auto'>
						<Button type='button' variant='outline' onClick={() => handleOpenChange(false)} disabled={isPending}>
							Cancel
						</Button>
						<Button type='submit' disabled={isPending}>
							{isPending ? <LoaderCircle className='h-4 w-4 animate-spin' /> : 'Save Changes'}
						</Button>
					</div>
				</div>
			</form>
		</ResponsiveDialogDrawer>
	)
}
