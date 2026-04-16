'use client'

import { useCallback, useState } from 'react'
import { type OrgSpecies, useOrgSpeciesCareInstructions, useOrgDetails } from '@/lib/react-query/queries'
import {
	useUpdateOrgSpecies,
	useDeactivateOrgSpecies,
	useAddBatchSpeciesToOrg,
	useAddOrgCareInstruction,
	useDeleteOrgCareInstruction
} from '@/lib/react-query/mutations'
import { CareInstructionsDropzone, type PendingDoc } from '@/components/superadmin/care-instructions-dropzone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Edit, LoaderCircle, PowerOff, Power } from 'lucide-react'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { useParams } from 'next/navigation'
import { UUID } from 'crypto'
import { toast } from 'sonner'

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

export function EditSpeciesOrgForm({ species, onDone }: EditSpeciesFormProps) {
	const [commonName, setCommonName] = useState(species.custom_common_name)
	const [careInstructions, setCareInstructions] = useState(species.custom_care_instructions ?? '')
	const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([])
	const [removedDocIds, setRemovedDocIds] = useState<string[]>([])
	const [uploading, setUploading] = useState(false)
	const updateSpecies = useUpdateOrgSpecies()
	const deactivateSpecies = useDeactivateOrgSpecies()
	const activateSpecies = useAddBatchSpeciesToOrg()
	const addOrgCareInstruction = useAddOrgCareInstruction()
	const deleteOrgCareInstruction = useDeleteOrgCareInstruction()
	const { data: existingDocs } = useOrgSpeciesCareInstructions(species.id)
	const visibleDocs = (existingDocs ?? []).filter((d) => !removedDocIds.includes(d.id))
	const params = useParams()
	const orgId = params?.orgId as UUID
	const { data: orgDetails } = useOrgDetails(orgId)

	const handleDocAdd = useCallback((doc: PendingDoc) => {
		setPendingDocs((prev) => [...prev, doc])
	}, [])

	const handlePendingRemove = useCallback((idx: number) => {
		setPendingDocs((prev) => prev.filter((_, i) => i !== idx))
	}, [])

	const handleExistingRemove = useCallback((docId: string) => {
		setRemovedDocIds((prev) => [...prev, docId])
	}, [])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setUploading(true)
		try {
			for (const docId of removedDocIds) {
				await deleteOrgCareInstruction.mutateAsync({ docId, orgSpeciesId: species.id })
			}
			for (const doc of pendingDocs) {
				await addOrgCareInstruction.mutateAsync({
					orgSpeciesId: species.id,
					orgId,
					file: doc.file,
					label: doc.label
				})
			}
		} catch (err) {
			console.error('Care instruction update failed:', err)
			setUploading(false)
			return
		}
		setUploading(false)
		if (
			commonName === species.custom_common_name &&
			careInstructions === species.custom_care_instructions &&
			removedDocIds.length === 0 &&
			pendingDocs.length === 0
		) {
			toast.info('No changes to save.')
			return
		}
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
			<CareInstructionsDropzone
				existingDocs={visibleDocs}
				pendingDocs={pendingDocs}
				uploading={uploading}
				onExistingRemove={handleExistingRemove}
				onDocAdd={handleDocAdd}
				onPendingRemove={handlePendingRemove}
			/>
			<div className='flex flex-col gap-2'>
				<Button type='submit' disabled={updateSpecies.isPending || uploading} className='w-full'>
					{updateSpecies.isPending || uploading ? <LoaderCircle className='h-4 w-4 animate-spin' /> : 'Save Changes'}
				</Button>
				<div className='flex gap-2'>
					<Button
						type='button'
						variant='outline'
						onClick={onDone}
						disabled={updateSpecies.isPending || uploading}
						className='flex-1'
					>
						Cancel
					</Button>
					<Button
						type='button'
						variant={species.is_active ? 'destructive' : 'default'}
						className='flex-1 gap-1.5'
						disabled={deactivateSpecies.isPending || activateSpecies.isPending}
						onClick={() => {
							if (species.is_active) {
								deactivateSpecies.mutate({ species_id: species.id, orgId }, { onSuccess: onDone })
							} else {
								activateSpecies.mutate(
									{ species_ids: [species.master_species_id], org_id: orgId },
									{ onSuccess: onDone }
								)
							}
						}}
					>
						{deactivateSpecies.isPending || activateSpecies.isPending ? (
							<LoaderCircle className='h-4 w-4 animate-spin' />
						) : species.is_active ? (
							<>
								<PowerOff className='h-4 w-4' />
								Set Inactive
							</>
						) : (
							<>
								<Power className='h-4 w-4' />
								Set Active
							</>
						)}
					</Button>
				</div>
			</div>
		</form>
	)
}

export function EditSpeciesOrgButton({ species, open, onOpenChange }: EditSpeciesDialogProps) {
	const [commonName, setCommonName] = useState(species.custom_common_name)
	const [careInstructions, setCareInstructions] = useState(species.custom_care_instructions ?? '')
	const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([])
	const [removedDocIds, setRemovedDocIds] = useState<string[]>([])
	const [uploading, setUploading] = useState(false)
	const updateSpecies = useUpdateOrgSpecies()
	const deactivateSpecies = useDeactivateOrgSpecies()
	const activateSpecies = useAddBatchSpeciesToOrg()
	const addOrgCareInstruction = useAddOrgCareInstruction()
	const deleteOrgCareInstruction = useDeleteOrgCareInstruction()
	const { data: existingDocs } = useOrgSpeciesCareInstructions(species.id)
	const visibleDocs = (existingDocs ?? []).filter((d) => !removedDocIds.includes(d.id))

	const params = useParams()
	const orgId = params?.orgId
	const { data: orgDetails } = useOrgDetails(orgId as UUID)

	const handleDocAdd = useCallback((doc: PendingDoc) => {
		setPendingDocs((prev) => [...prev, doc])
	}, [])

	const handlePendingRemove = useCallback((idx: number) => {
		setPendingDocs((prev) => prev.filter((_, i) => i !== idx))
	}, [])

	const handleExistingRemove = useCallback((docId: string) => {
		setRemovedDocIds((prev) => [...prev, docId])
	}, [])

	const resetForm = () => {
		setCommonName(species.custom_common_name)
		setCareInstructions(species.custom_care_instructions ?? '')
		setPendingDocs([])
		setRemovedDocIds([])
	}

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) resetForm()
		onOpenChange(isOpen)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setUploading(true)
		try {
			for (const docId of removedDocIds) {
				await deleteOrgCareInstruction.mutateAsync({ docId, orgSpeciesId: species.id })
			}
			for (const doc of pendingDocs) {
				await addOrgCareInstruction.mutateAsync({
					orgSpeciesId: species.id,
					orgId: orgId as string,
					file: doc.file,
					label: doc.label
				})
			}
		} catch (err) {
			console.error('Care instruction update failed:', err)
			setUploading(false)
			return
		}
		setUploading(false)

		updateSpecies.mutate({
			species_id: species.id,
			custom_common_name: commonName,
			custom_care_instructions: careInstructions,
			org_id: orgId as UUID
		})

		handleOpenChange(false)
	}

	const isPending = updateSpecies.isPending || deactivateSpecies.isPending || activateSpecies.isPending || uploading

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
				</div>{' '}
				<CareInstructionsDropzone
					existingDocs={visibleDocs}
					pendingDocs={pendingDocs}
					uploading={uploading}
					onExistingRemove={handleExistingRemove}
					onDocAdd={handleDocAdd}
					onPendingRemove={handlePendingRemove}
				/>{' '}
				<div className='flex flex-col gap-2'>
					<Button type='submit' disabled={isPending} className='w-full'>
						{isPending ? <LoaderCircle className='h-4 w-4 animate-spin' /> : 'Save Changes'}
					</Button>
					<div className='flex gap-2'>
						<Button
							type='button'
							variant='outline'
							onClick={() => handleOpenChange(false)}
							disabled={isPending}
							className='flex-1'
						>
							Cancel
						</Button>
						<Button
							type='button'
							variant={species.is_active ? 'destructive' : 'default'}
							className='flex-1 gap-1.5'
							disabled={isPending}
							onClick={() => {
								if (species.is_active) {
									deactivateSpecies.mutate(
										{ species_id: species.id, orgId: orgId as UUID },
										{ onSuccess: () => handleOpenChange(false) }
									)
								} else {
									activateSpecies.mutate(
										{ species_ids: [species.master_species_id], org_id: orgId as UUID },
										{ onSuccess: () => handleOpenChange(false) }
									)
								}
							}}
						>
							{isPending ? (
								<LoaderCircle className='h-4 w-4 animate-spin' />
							) : species.is_active ? (
								<>
									<PowerOff className='h-4 w-4' />
									Set Inactive
								</>
							) : (
								<>
									<Power className='h-4 w-4' />
									Set Active
								</>
							)}
						</Button>
					</div>
				</div>
			</form>
		</ResponsiveDialogDrawer>
	)
}
