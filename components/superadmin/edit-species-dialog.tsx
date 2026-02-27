'use client'

import { useState } from 'react'
import { type Species } from '@/lib/react-query/queries'
import { useUpdateSpecies, useUpdateSpeciesImage } from '@/lib/react-query/mutations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LoaderCircle } from 'lucide-react'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { SpeciesImageDropzone } from '@/components/superadmin/species-image-dropzone'
import { createClient } from '@/lib/supabase/client'
import { DeleteSpeciesButton } from '@/components/superadmin/delete-species-button'

interface EditSpeciesDialogProps {
	species: Species
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function EditSpeciesDialog({ species, open, onOpenChange }: EditSpeciesDialogProps) {
	const [scientificName, setScientificName] = useState(species.scientific_name)
	const [commonName, setCommonName] = useState(species.common_name)
	const [careInstructions, setCareInstructions] = useState(species.care_instructions ?? '')
	const [selectedImage, setSelectedImage] = useState<File | null>(null)
	const [previewUrl, setPreviewUrl] = useState<string | null>(null)
	const [uploading, setUploading] = useState(false)
	const [uploadProgress, setUploadProgress] = useState(0)

	const updateSpecies = useUpdateSpecies()
	const updateImage = useUpdateSpeciesImage()

	const resetForm = () => {
		setScientificName(species.scientific_name)
		setCommonName(species.common_name)
		setCareInstructions(species.care_instructions ?? '')
		if (previewUrl) URL.revokeObjectURL(previewUrl)
		setSelectedImage(null)
		setPreviewUrl(null)
		setUploadProgress(0)
	}

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
		>
			<form onSubmit={handleSubmit} className='flex flex-col gap-4 overflow-y-auto px-1'>
				{/* Current image */}
				{species.picture_url && !previewUrl && (
					<div className='flex flex-col gap-1.5'>
						<Label className='text-xs text-muted-foreground'>Current Image</Label>
						<img
							src={species.picture_url}
							alt={species.common_name}
							className='rounded-md max-h-36 w-full object-contain border'
						/>
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

				<div className='flex gap-2'>
					<DeleteSpeciesButton species_id={species.id} onDeleted={() => handleOpenChange(false)} />
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
