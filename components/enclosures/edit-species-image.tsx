import { Edit } from 'lucide-react'
import { ResponsiveDialogDrawer } from '../ui/dialog-to-drawer'
import { OrgSpecies, useOneSpecies } from '@/lib/react-query/queries'
import { useState, useCallback } from 'react'
import { Button } from '../ui/button'
import { useDropzone } from 'react-dropzone'
import { CloudUploadIcon } from 'lucide-react'
import { Progress } from '../ui/progress'
import { createClient } from '@/lib/supabase/client'
import { useUpdateSpeciesImage } from '@/lib/react-query/mutations'

export default function EditImageDialog({ species }: { species: OrgSpecies }) {
	const [open, setOpen] = useState(false)
	const [loading, setLoading] = useState(false)
	const [progress, setProgress] = useState(0)
	const [selectedImage, setSelectedImage] = useState<File | null>(null)
	const [previewUrl, setPreviewUrl] = useState<string | null>(null)

	const { data: spec } = useOneSpecies(species.master_species_id)
	console.log(spec)

	const supabase = createClient()

	const editSpeciesImage = useUpdateSpeciesImage()

	// Upload and save to database
	const handleSave = async () => {
		if (!selectedImage || !species.master_species_id) {
			console.log('Early return - missing selectedImage or species.master_species_id')
			return
		}
		setLoading(true)
		setProgress(0)

		try {
			const fileName = `${Date.now()}-${selectedImage.name}`
			const { data, error } = await supabase.storage.from('species_images').upload(fileName, selectedImage)

			if (error) throw error

			setProgress(50)

			const { data: publicData } = supabase.storage.from('species_images').getPublicUrl(data.path)

			editSpeciesImage.mutate(
				{
					species_id: species.master_species_id,
					picture_url: publicData.publicUrl
				},
				{
					onSuccess: () => {
						setOpen(false)
						setSelectedImage(null)
						setPreviewUrl(null)
						setProgress(100)
					},
					onError: (err) => {
						console.error('Failed to update species image:', err)
						alert('Failed to save image')
					}
				}
			)
		} catch (error) {
			console.error('Upload failed:', error)
			alert('Failed to upload image')
		} finally {
			setLoading(false)
		}
	}

	// Handle file selection - just show preview
	const onDrop = useCallback((acceptedFiles: File[]) => {
		if (acceptedFiles.length > 0) {
			const file = acceptedFiles[0]
			setSelectedImage(file)
			// Create preview URL
			const url = URL.createObjectURL(file)
			setPreviewUrl(url)
		}
	}, [])

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
		},
		maxFiles: 1
	})

	// Clean up preview URL when dialog closes
	const handleOpenChange = (isOpen: boolean) => {
		setOpen(isOpen)
		if (!isOpen) {
			if (previewUrl) URL.revokeObjectURL(previewUrl)
			setSelectedImage(null)
			setPreviewUrl(null)
			setProgress(0)
		}
	}

	return (
		<ResponsiveDialogDrawer
			title={'Species Image'}
			description={'Edit the image shown for the species'}
			open={open}
			onOpenChange={handleOpenChange}
			trigger={
				<div className='flex flex-1 flex-row cursor-pointer'>
					Edit Image <Edit className='size-4 ml-auto my-auto' />
				</div>
			}
		>
			<div className='flex flex-col gap-4 py-2'>
				<h2 className='font-medium'>Current Image for {species.custom_common_name}</h2>
				{spec?.picture_url ? (
					<img
						src={spec.picture_url}
						alt={species.custom_common_name}
						className='rounded-md max-h-48 object-contain mx-auto'
					/>
				) : (
					<p className='mx-auto text-muted-foreground'>No image yet</p>
				)}
			</div>

			{/* Preview of selected image */}
			{previewUrl && (
				<div className='flex flex-col gap-2 py-2'>
					<h3 className='font-medium'>New Image Preview</h3>
					<img src={previewUrl} alt='Preview' className='rounded-md max-h-48 object-contain mx-auto' />
				</div>
			)}

			<div
				{...getRootProps()}
				className={`border-2 border-dashed p-4 rounded cursor-pointer transition-colors ${isDragActive ? 'bg-accent border-primary' : 'hover:bg-accent/50'}`}
			>
				<input {...getInputProps()} />
				{loading ? (
					<div className='flex flex-col items-center gap-2'>
						<Progress value={progress} className='w-full' />
						<p className='text-sm text-muted-foreground'>Uploading...</p>
					</div>
				) : (
					<div className='text-center'>
						<CloudUploadIcon className='mx-auto mb-2 h-8 w-8 text-muted-foreground' />
						<p className='text-sm'>
							{selectedImage ? 'Drop a new image or click to replace' : 'Drag image here or click to select'}
						</p>
					</div>
				)}
			</div>

			<div className='flex gap-2 pt-2'>
				<Button type='button' variant='secondary' onClick={() => handleOpenChange(false)}>
					Cancel
				</Button>
				<Button
					type='button'
					disabled={loading || !selectedImage}
					onClick={() => {
						handleSave()
					}}
				>
					{loading ? 'Saving...' : 'Save'}
				</Button>
			</div>
		</ResponsiveDialogDrawer>
	)
}
