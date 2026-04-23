'use client'

import { useCallback, useState } from 'react'
import { useAddCareInstruction, useCreateSpecies } from '@/lib/react-query/mutations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LoaderCircle, PlusIcon } from 'lucide-react'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { SpeciesImageDropzone } from './species-image-dropzone'
import { CareInstructionsDropzone, type PendingDoc } from './care-instructions-dropzone'
import { createClient } from '@/lib/supabase/client'

export function CreateSpeciesButton() {
	const [open, setOpen] = useState(false)
	const [scientificName, setScientificName] = useState('')
	const [commonName, setCommonName] = useState('')
	const [careInstructions, setCareInstructions] = useState('')
	const [selectedImage, setSelectedImage] = useState<File | null>(null)
	const [previewUrl, setPreviewUrl] = useState<string | null>(null)
	const [uploading, setUploading] = useState(false)
	const [uploadProgress, setUploadProgress] = useState(0)
	const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([])

	const createSpecies = useCreateSpecies()
	const addCareInstruction = useAddCareInstruction()

	const resetForm = () => {
		setScientificName('')
		setCommonName('')
		setCareInstructions('')
		if (previewUrl) URL.revokeObjectURL(previewUrl)
		setSelectedImage(null)
		setPreviewUrl(null)
		setUploadProgress(0)
		setPendingDocs([])
	}

	const handleDocAdd = useCallback((doc: PendingDoc) => {
		setPendingDocs((prev) => [...prev, doc])
	}, [])

	const handlePendingRemove = useCallback((idx: number) => {
		setPendingDocs((prev) => prev.filter((_, i) => i !== idx))
	}, [])

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) resetForm()
		setOpen(isOpen)
	}

	const handleFileSelect = (file: File, preview: string) => {
		setSelectedImage(file)
		setPreviewUrl(preview)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		let pictureUrl: string | undefined

		setUploading(true)
		try {
			const supabase = createClient()

			if (selectedImage) {
				setUploadProgress(0)
				const fileName = `${Date.now()}-${selectedImage.name}`
				const { data, error } = await supabase.storage.from('species_images').upload(fileName, selectedImage)
				if (error) throw error
				setUploadProgress(50)
				const { data: publicData } = supabase.storage.from('species_images').getPublicUrl(data.path)
				pictureUrl = publicData.publicUrl
			}

			setUploadProgress(100)
		} catch (err) {
			console.error('Upload failed:', err)
			setUploading(false)
			return
		} finally {
			setUploading(false)
		}

		createSpecies.mutate(
			{
				scientific_name: scientificName,
				common_name: commonName,
				care_instructions: careInstructions,
				picture_url: pictureUrl
			},
			{
				onSuccess: async (data) => {
					for (const doc of pendingDocs) {
						await addCareInstruction.mutateAsync({
							speciesId: data.id,
							file: doc.file,
							label: doc.label
						})
					}
					handleOpenChange(false)
				}
			}
		)
	}

	const isPending = createSpecies.isPending || addCareInstruction.isPending || uploading

	return (
		<ResponsiveDialogDrawer
			title='Add New Species'
			description='Fill in the details for the new species'
			open={open}
			onOpenChange={handleOpenChange}
			trigger={
				<Button size='sm' className='gap-1.5'>
					<PlusIcon className='h-4 w-4' />
					Add Species
				</Button>
			}
		>
			<form onSubmit={handleSubmit} className='flex flex-col gap-4 overflow-y-auto max-h-[70vh] px-1'>
				<SpeciesImageDropzone
					label='Species Image (optional)'
					previewUrl={previewUrl}
					uploading={uploading}
					uploadProgress={uploadProgress}
					onFileSelect={handleFileSelect}
				/>

				<div className='grid gap-3'>
					<div className='flex flex-col gap-1.5'>
						<Label htmlFor='create_common_name'>Common Name</Label>
						<Input
							id='create_common_name'
							value={commonName}
							onChange={(e) => setCommonName(e.target.value)}
							disabled={isPending}
							required
							placeholder='e.g. Tarantula'
						/>
					</div>
					<div className='flex flex-col gap-1.5'>
						<Label htmlFor='create_scientific_name'>Scientific Name</Label>
						<Input
							id='create_scientific_name'
							value={scientificName}
							onChange={(e) => setScientificName(e.target.value)}
							disabled={isPending}
							required
							placeholder='e.g. Theraphosa blondi'
						/>
					</div>
					<div className='flex flex-col gap-1.5'>
						<Label htmlFor='create_care'>Care Instructions</Label>
						<Textarea
							id='create_care'
							value={careInstructions}
							onChange={(e) => setCareInstructions(e.target.value)}
							disabled={isPending}
							rows={4}
							placeholder='Enter care instructions…'
						/>
					</div>
				</div>
				<CareInstructionsDropzone
					existingDocs={[]}
					pendingDocs={pendingDocs}
					uploading={uploading}
					onExistingRemove={() => {}}
					onDocAdd={handleDocAdd}
					onPendingRemove={handlePendingRemove}
				/>
				<div className='flex flex-col gap-2 justify-end'>
					<Button type='submit' disabled={isPending}>
						{isPending ? <LoaderCircle className='h-4 w-4 animate-spin' /> : 'Create Species'}
					</Button>
					<Button type='button' variant='outline' onClick={() => handleOpenChange(false)} disabled={isPending}>
						Cancel
					</Button>
				</div>
			</form>
		</ResponsiveDialogDrawer>
	)
}
