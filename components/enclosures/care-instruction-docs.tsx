'use client'
import { useState } from 'react'
import { ChevronDown, FileIcon } from 'lucide-react'
import Image from 'next/image'
import { Badge } from '../ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import { ResponsiveDialogDrawer } from '../ui/dialog-to-drawer'
import type { SpeciesCareInstructions } from '@/lib/react-query/queries'

export function CareInstructionDocs({
	defaultDocs,
	orgDocs,
	careInstructions
}: {
	defaultDocs: SpeciesCareInstructions[]
	orgDocs: SpeciesCareInstructions[]
	careInstructions?: string | null
}) {
	const [defaultDocsOpen, setDefaultDocsOpen] = useState(false)
	const [orgDocsOpen, setOrgDocsOpen] = useState(false)
	const [docPreview, setDocPreview] = useState<{ src: string; name: string; isImg: boolean } | null>(null)

	const visibleDefaultDocs = defaultDocs.filter((d) => !d.is_hidden_by_org)
	const hasAnything = !!careInstructions || visibleDefaultDocs.length > 0 || orgDocs.length > 0

	return (
		<div className='flex flex-col gap-3'>
			<p className='text-sm font-semibold'>Care Instructions</p>
			<div className='flex flex-col gap-3 max-h-72 overflow-y-auto scrollbar-no-track'>
				{!hasAnything && (
					<p className='text-sm text-muted-foreground'>No care instructions or documents have been added yet.</p>
				)}
				{careInstructions && (
					<div className='rounded-md bg-muted p-3'>
						<p className='text-sm leading-relaxed'>{careInstructions}</p>
					</div>
				)}
				<>
					{visibleDefaultDocs.length > 0 && (
						<Collapsible open={defaultDocsOpen} onOpenChange={setDefaultDocsOpen}>
							<CollapsibleTrigger className='flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent/50 transition-colors'>
								<span>Default Care Documents ({visibleDefaultDocs.length})</span>
								<ChevronDown
									className={`h-4 w-4 text-muted-foreground transition-transform ${defaultDocsOpen ? 'rotate-180' : ''}`}
								/>
							</CollapsibleTrigger>
							<CollapsibleContent>
								<div className='flex flex-col gap-1 pt-1'>
									{visibleDefaultDocs.map((doc) => {
										const ext = doc.file_url.split('.').pop()?.split('?')[0]?.toLowerCase()
										return (
											<button
												key={doc.id}
												type='button'
												className='flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm hover:bg-accent/50 transition-colors w-full text-left'
												onClick={() =>
													setDocPreview({
														src: doc.file_url,
														name: doc.file_name,
														isImg: /\.(png|jpe?g|gif|webp)$/i.test(doc.file_url)
													})
												}
											>
												<FileIcon className='h-4 w-4 shrink-0 text-muted-foreground' />
												<span className='flex-1 min-w-0 truncate text-xs'>{doc.file_name}</span>
												{ext && (
													<Badge variant='secondary' className='text-[10px] px-1.5 py-0 uppercase shrink-0'>
														{ext}
													</Badge>
												)}
											</button>
										)
									})}
								</div>
							</CollapsibleContent>
						</Collapsible>
					)}
					{orgDocs.length > 0 && (
						<Collapsible open={orgDocsOpen} onOpenChange={setOrgDocsOpen}>
							<CollapsibleTrigger className='flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent/50 transition-colors'>
								<span>Org Care Documents ({orgDocs.length})</span>
								<ChevronDown
									className={`h-4 w-4 text-muted-foreground transition-transform ${orgDocsOpen ? 'rotate-180' : ''}`}
								/>
							</CollapsibleTrigger>
							<CollapsibleContent>
								<div className='flex flex-col gap-1 pt-1'>
									{orgDocs.map((doc) => {
										const ext = doc.file_url.split('.').pop()?.split('?')[0]?.toLowerCase()
										return (
											<button
												key={doc.id}
												type='button'
												className='flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm hover:bg-accent/50 transition-colors w-full text-left'
												onClick={() =>
													setDocPreview({
														src: doc.file_url,
														name: doc.file_name,
														isImg: /\.(png|jpe?g|gif|webp)$/i.test(doc.file_url)
													})
												}
											>
												<FileIcon className='h-4 w-4 shrink-0 text-muted-foreground' />
												<span className='flex-1 min-w-0 truncate text-xs'>{doc.file_name}</span>
												{ext && (
													<Badge variant='secondary' className='text-[10px] px-1.5 py-0 uppercase shrink-0'>
														{ext}
													</Badge>
												)}
											</button>
										)
									})}
								</div>
							</CollapsibleContent>
						</Collapsible>
					)}

					<ResponsiveDialogDrawer
						title={docPreview?.name ?? ''}
						description='File preview'
						trigger={null}
						open={!!docPreview}
						onOpenChange={(open) => {
							if (!open) setDocPreview(null)
						}}
						className='sm:max-w-4xl h-[85vh]'
					>
						{docPreview &&
							(docPreview.isImg ? (
								<div className='relative flex-1 min-h-0'>
									<Image src={docPreview.src} alt={docPreview.name} fill unoptimized className='object-contain' />
								</div>
							) : (
								<iframe
									src={docPreview.src}
									title={docPreview.name}
									className='flex-1 w-full min-h-0 border-0 bg-white rounded-md'
									style={{ height: '100%' }}
								/>
							))}
					</ResponsiveDialogDrawer>
				</>
			</div>
		</div>
	)
}
