'use client'

import { useCallback, useState } from 'react'
import { type Species, useSpeciesCareInstructions } from '@/lib/react-query/queries'
import {
	useAddCareInstruction,
	useDeleteCareInstruction,
	useUpdateSpecies,
	useUpdateSpeciesImage
} from '@/lib/react-query/mutations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LoaderCircle, ZoomInIcon } from 'lucide-react'
import Image from 'next/image'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { SpeciesImageDropzone } from '@/components/superadmin/species-image-dropzone'
import { CareInstructionsDropzone, type PendingDoc } from './care-instructions-dropzone'
import { createClient } from '@/lib/supabase/client'
import { DeleteSpeciesButton } from '@/components/superadmin/delete-species-button'

interface EditSpeciesDialogProps {
	species: Species
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function EditSpeciesButton({ species, open, onOpenChange }: EditSpeciesDialogProps) {
	const [scientificName, setScientificName] = useState(species.scientific_name)
	const [commonName, setCommonName] = useState(species.common_name)
	const [careInstructions, setCareInstructions] = useState(species.care_instructions ?? '')
	const [selectedImage, setSelectedImage] = useState<File | null>(null)
	const [previewUrl, setPreviewUrl] = useState<string | null>(null)
	const [uploading, setUploading] = useState(false)
	const [uploadProgress, setUploadProgress] = useState(0)
	const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([])
	const [removedDocIds, setRemovedDocIds] = useState<string[]>([])
	const [imagePreviewOpen, setImagePreviewOpen] = useState(false)

	const updateSpecies = useUpdateSpecies()
	const updateImage = useUpdateSpeciesImage()
	const addCareInstruction = useAddCareInstruction()
	const deleteCareInstruction = useDeleteCareInstruction()
	const { data: existingDocs } = useSpeciesCareInstructions(species.id)

	// Filter out docs that have been marked for removal
	const visibleDocs = (existingDocs ?? []).filter((d) => !removedDocIds.includes(d.id))

	const resetForm = () => {
		setScientificName(species.scientific_name)
		setCommonName(species.common_name)
		setCareInstructions(species.care_instructions ?? '')
		if (previewUrl) URL.revokeObjectURL(previewUrl)
		setSelectedImage(null)
		setPreviewUrl(null)
		setUploadProgress(0)
		setPendingDocs([])
		setRemovedDocIds([])
	}

	const handleDocAdd = useCallback((doc: PendingDoc) => {
		setPendingDocs((prev) => [...prev, doc])
	}, [])

	const handlePendingRemove = useCallback((idx: number) => {
		setPendingDocs((prev) => prev.filter((_, i) => i !== idx))
	}, [])

	const handleExistingCareRemove = useCallback((docId: string) => {
		setRemovedDocIds((prev) => [...prev, docId])
	}, [])

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) resetForm()
		onOpenChange(isOpen)
	}

	const handleFileSelect = (file: File, preview: string) => {
		setSelectedImage(file)
		setPreviewUrl(preview)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setUploading(true)

		try {
			for (const docId of removedDocIds) {
				await deleteCareInstruction.mutateAsync({ docId, speciesId: species.id })
			}

			for (const doc of pendingDocs) {
				await addCareInstruction.mutateAsync({ speciesId: species.id, file: doc.file, label: doc.label })
			}
		} catch (err) {
			console.error('Care instruction update failed:', err)
			setUploading(false)
			return
		}

		setUploading(false)

		updateSpecies.mutate({
			species_id: species.id,
			scientific_name: scientificName,
			common_name: commonName,
			care_instructions: careInstructions
		})

		if (selectedImage) {
			setUploading(true)
			setUploadProgress(0)
			try {
				const supabase = createClient()
				const fileName = `${Date.now()}-${selectedImage.name}`
				const { data, error } = await supabase.storage.from('species_images').upload(fileName, selectedImage)
				if (error) throw error
				setUploadProgress(60)
				const { data: publicData } = supabase.storage.from('species_images').getPublicUrl(data.path)
				updateImage.mutate({ species_id: species.id, picture_url: publicData.publicUrl })
				setUploadProgress(100)
			} catch (err) {
				console.error('Image upload failed:', err)
			} finally {
				setUploading(false)
			}
		}

		handleOpenChange(false)
	}

	const isPending = updateSpecies.isPending || updateImage.isPending || uploading

	return (
		<ResponsiveDialogDrawer
			title={`Edit: ${species.common_name}`}
			description={species.scientific_name}
			open={open}
			onOpenChange={handleOpenChange}
			trigger={<span className='hidden' />}
			footer={
				<div className='flex flex-col gap-2 w-full'>
					<Button type='submit' form='edit-species-form' disabled={isPending}>
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
						<DeleteSpeciesButton species_id={species.id} onDeleted={() => handleOpenChange(false)} />
					</div>
				</div>
			}
		>
			<form
				id='edit-species-form'
				onSubmit={handleSubmit}
				className='overflow-y-auto flex-1 min-h-0 flex flex-col gap-4 px-1'
			>
				{/* Current image */}
				{species.picture_url && !previewUrl && (
					<div className='flex flex-col gap-1.5'>
						<Label className='text-xs text-muted-foreground'>Current Image</Label>
						<button
							type='button'
							className='relative group rounded-md border overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
							onClick={() => setImagePreviewOpen(true)}
						>
							<Image
								src={species.picture_url}
								alt={species.common_name}
								width={400}
								height={144}
								className='max-h-36 w-full object-contain'
							/>
							<div className='absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center'>
								<ZoomInIcon className='h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow' />
							</div>
						</button>
						<ResponsiveDialogDrawer
							title={species.common_name}
							description={species.scientific_name}
							trigger={null}
							open={imagePreviewOpen}
							onOpenChange={setImagePreviewOpen}
							className='sm:max-w-3xl h-[85vh]'
						>
							<div className='relative flex-1 min-h-0'>
								<Image
									src={species.picture_url}
									alt={species.common_name}
									fill
									unoptimized
									className='object-contain'
								/>
							</div>
						</ResponsiveDialogDrawer>
					</div>
				)}

				<SpeciesImageDropzone
					label={species.picture_url ? 'Replace Image' : 'Add Image'}
					previewUrl={previewUrl}
					uploading={uploading}
					uploadProgress={uploadProgress}
					onFileSelect={handleFileSelect}
				/>

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
						<Label htmlFor='edit_scientific_name'>Scientific Name</Label>
						<Input
							id='edit_scientific_name'
							value={scientificName}
							onChange={(e) => setScientificName(e.target.value)}
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

				<CareInstructionsDropzone
					existingDocs={visibleDocs}
					pendingDocs={pendingDocs}
					uploading={uploading}
					onExistingRemove={handleExistingCareRemove}
					onDocAdd={handleDocAdd}
					onPendingRemove={handlePendingRemove}
				/>
			</form>
		</ResponsiveDialogDrawer>
	)
}
