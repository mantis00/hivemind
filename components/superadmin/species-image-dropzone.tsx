'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { CloudUploadIcon, LoaderCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'

interface SpeciesImageDropzoneProps {
	label?: string
	previewUrl: string | null
	uploading: boolean
	uploadProgress: number
	onFileSelect: (file: File, preview: string) => void
}

export function SpeciesImageDropzone({
	label = 'Image',
	previewUrl,
	uploading,
	uploadProgress,
	onFileSelect
}: SpeciesImageDropzoneProps) {
	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			if (acceptedFiles.length > 0) {
				const file = acceptedFiles[0]
				const url = URL.createObjectURL(file)
				onFileSelect(file, url)
			}
		},
		[onFileSelect]
	)

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
		maxFiles: 1,
		disabled: uploading
	})

	return (
		<div className='flex flex-col gap-1.5'>
			<Label className='text-xs text-muted-foreground'>{label}</Label>

			{previewUrl && (
				<img src={previewUrl} alt='Preview' className='rounded-md max-h-36 w-full object-contain border mb-1' />
			)}

			<div
				{...getRootProps()}
				className={`border-2 border-dashed p-3 rounded-md cursor-pointer transition-colors text-center ${
					isDragActive ? 'bg-accent border-primary' : uploading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-accent/50'
				}`}
			>
				<input {...getInputProps()} />
				{uploading ? (
					<div className='flex flex-col items-center gap-2'>
						<LoaderCircle className='h-5 w-5 animate-spin text-muted-foreground mx-auto' />
						<Progress value={uploadProgress} className='w-full' />
						<p className='text-xs text-muted-foreground'>Uploading…</p>
					</div>
				) : (
					<div className='flex flex-col items-center gap-1'>
						<CloudUploadIcon className='h-6 w-6 text-muted-foreground' />
						<p className='text-xs text-muted-foreground'>
							{isDragActive ? 'Drop here…' : 'Drag image here or click to select'}
						</p>
					</div>
				)}
			</div>
		</div>
	)
}
