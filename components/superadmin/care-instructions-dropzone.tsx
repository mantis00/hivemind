'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileIcon, X, ExternalLinkIcon, FileUpIcon, PlusIcon } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import Image from 'next/image'

function isImage(name: string) {
	return /\.(png|jpe?g|gif|webp)$/i.test(name)
}

export interface PendingDoc {
	file: File
	label: string
}

interface CareInstructionsDropzoneProps {
	existingDocs: { id: string; file_name: string; file_url: string }[]
	pendingDocs: PendingDoc[]
	uploading: boolean
	onExistingRemove: (docId: string) => void
	onDocAdd: (doc: PendingDoc) => void
	onPendingRemove: (index: number) => void
}

function getFileName(url: string) {
	try {
		return decodeURIComponent(url.split('/').pop() ?? url)
	} catch {
		return url.split('/').pop() ?? url
	}
}

export function CareInstructionsDropzone({
	existingDocs,
	pendingDocs,
	uploading,
	onExistingRemove,
	onDocAdd,
	onPendingRemove
}: CareInstructionsDropzoneProps) {
	const [preview, setPreview] = useState<{ src: string; name: string; isObjectUrl: boolean; isImg: boolean } | null>(
		null
	)
	const [adding, setAdding] = useState(false)
	const [stagedFile, setStagedFile] = useState<File | null>(null)
	const [docLabel, setDocLabel] = useState('')

	const openExisting = (url: string, name: string) => {
		setPreview({ src: url, name, isObjectUrl: false, isImg: isImage(url) })
	}

	const openPending = (file: File) => {
		const src = URL.createObjectURL(file)
		setPreview({ src, name: file.name, isObjectUrl: true, isImg: isImage(file.name) })
	}

	const closePreview = useCallback(() => {
		if (preview?.isObjectUrl) URL.revokeObjectURL(preview.src)
		setPreview(null)
	}, [preview])

	const resetAdding = () => {
		setStagedFile(null)
		setDocLabel('')
		setAdding(false)
	}

	const handleConfirmAdd = () => {
		if (!stagedFile || !docLabel.trim()) return
		onDocAdd({ file: stagedFile, label: docLabel.trim() })
		resetAdding()
	}

	const onDrop = useCallback((accepted: File[]) => {
		if (accepted.length > 0) setStagedFile(accepted[0])
	}, [])

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
			'application/pdf': ['.pdf']
		},
		multiple: false,
		disabled: uploading
	})

	const hasItems = existingDocs.length > 0 || pendingDocs.length > 0

	return (
		<>
			<div className='flex flex-col gap-2'>
				<Label className='text-xs text-muted-foreground'>Care Instruction Documents</Label>

				{hasItems && (
					<div className='flex flex-col gap-1.5 max-h-52 overflow-y-auto scrollbar-no-track'>
						{existingDocs.map((doc) => {
							const ext = doc.file_url.split('.').pop()?.split('?')[0]?.toLowerCase()
							return (
								<div key={doc.id} className='flex items-center gap-2 rounded-md border px-2 py-1.5 bg-muted/30 text-sm'>
									<FileIcon className='h-4 w-4 shrink-0 text-muted-foreground' />
									<button
										type='button'
										className='flex-1 min-w-0 truncate text-xs text-left hover:underline flex items-center gap-1'
										onClick={() => openExisting(doc.file_url, doc.file_name ?? getFileName(doc.file_url))}
									>
										<span className='truncate'>{doc.file_name ?? getFileName(doc.file_url)}</span>
										<ExternalLinkIcon className='h-3 w-3 shrink-0' />
									</button>
									{ext && (
										<Badge variant='secondary' className='text-[10px] px-1.5 py-0 uppercase shrink-0'>
											{ext}
										</Badge>
									)}
									<button
										type='button'
										className='rounded-full p-0.5 hover:bg-muted-foreground/20 shrink-0'
										onClick={() => onExistingRemove(doc.id)}
										disabled={uploading}
									>
										<X className='h-3.5 w-3.5' />
									</button>
								</div>
							)
						})}

						{pendingDocs.map((doc, idx) => {
							const ext = doc.file.name.split('.').pop()?.toLowerCase()
							return (
								<div
									key={`pending-${idx}-${doc.file.name}`}
									className='flex items-center gap-2 rounded-md border border-dashed px-2 py-1.5 text-sm'
								>
									<FileIcon className='h-4 w-4 shrink-0 text-muted-foreground' />
									<button
										type='button'
										className='flex-1 min-w-0 truncate text-xs text-left text-muted-foreground hover:underline'
										onClick={() => openPending(doc.file)}
									>
										{doc.label}
									</button>
									{ext && (
										<Badge variant='secondary' className='text-[10px] px-1.5 py-0 uppercase shrink-0'>
											{ext}
										</Badge>
									)}
									<button
										type='button'
										className='rounded-full p-0.5 hover:bg-muted-foreground/20 shrink-0'
										onClick={() => onPendingRemove(idx)}
										disabled={uploading}
									>
										<X className='h-3.5 w-3.5' />
									</button>
								</div>
							)
						})}
					</div>
				)}

				{adding ? (
					<div className='flex flex-col gap-2 rounded-md border p-3'>
						<div className='flex flex-col gap-1.5'>
							<Label htmlFor='doc-label' className='text-xs'>
								Document Label
							</Label>
							<Input
								id='doc-label'
								value={docLabel}
								onChange={(e) => setDocLabel(e.target.value)}
								placeholder='e.g. Feeding Guide'
								disabled={uploading}
								autoFocus
							/>
						</div>

						{stagedFile ? (
							<div className='flex items-center gap-2 rounded-md border px-2 py-1.5 bg-muted/30 text-sm'>
								<FileIcon className='h-4 w-4 shrink-0 text-muted-foreground' />
								<span className='flex-1 min-w-0 truncate text-xs text-muted-foreground'>{stagedFile.name}</span>
								<button
									type='button'
									className='ml-auto rounded-full p-0.5 hover:bg-muted-foreground/20 shrink-0'
									onClick={() => setStagedFile(null)}
								>
									<X className='h-3.5 w-3.5' />
								</button>
							</div>
						) : (
							<div
								{...getRootProps()}
								className={`border-2 border-dashed p-3 rounded-md cursor-pointer transition-colors text-center ${
									isDragActive
										? 'bg-accent border-primary'
										: uploading
											? 'opacity-60 cursor-not-allowed'
											: 'hover:bg-accent/50'
								}`}
							>
								<input {...getInputProps()} />
								<div className='flex flex-col items-center gap-1'>
									<FileUpIcon className='h-5 w-5 text-muted-foreground' />
									<p className='text-xs text-muted-foreground'>
										{isDragActive ? 'Drop here…' : 'Drag a PDF or image here, or click to select'}
									</p>
								</div>
							</div>
						)}

						<div className='flex gap-2'>
							<Button
								type='button'
								size='sm'
								onClick={handleConfirmAdd}
								disabled={!stagedFile || !docLabel.trim() || uploading}
								className='flex-1'
							>
								Add
							</Button>
							<Button type='button' size='sm' variant='outline' onClick={resetAdding} disabled={uploading}>
								Cancel
							</Button>
						</div>
					</div>
				) : (
					<Button
						type='button'
						variant='outline'
						size='sm'
						onClick={() => setAdding(true)}
						disabled={uploading}
						className='gap-1.5'
					>
						<PlusIcon className='h-4 w-4' />
						Add Document
					</Button>
				)}
			</div>

			<ResponsiveDialogDrawer
				title={preview?.name ?? ''}
				description='File preview'
				trigger={null}
				open={!!preview}
				onOpenChange={(open) => {
					if (!open) closePreview()
				}}
				className='sm:max-w-4xl h-[85vh]'
			>
				{preview &&
					(preview.isImg ? (
						<div className='relative flex-1 min-h-0 overflow-auto'>
							<Image src={preview.src} alt={preview.name} fill unoptimized className='object-contain' />
						</div>
					) : (
						<iframe
							src={preview.src}
							title={preview.name}
							className='flex-1 w-full min-h-0 border-0 bg-white rounded-md'
							style={{ height: '100%' }}
						/>
					))}
			</ResponsiveDialogDrawer>
		</>
	)
}
