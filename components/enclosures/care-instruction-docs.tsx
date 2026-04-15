'use client'
import { useState } from 'react'
import { ChevronDown, FileIcon } from 'lucide-react'
import Image from 'next/image'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import { ResponsiveDialogDrawer } from '../ui/dialog-to-drawer'
import type { SpeciesCareInstructions } from '@/lib/react-query/queries'

export function CareInstructionDocs({
	defaultDocs,
	orgDocs
}: {
	defaultDocs: SpeciesCareInstructions[]
	orgDocs: SpeciesCareInstructions[]
}) {
	const [defaultDocsOpen, setDefaultDocsOpen] = useState(false)
	const [orgDocsOpen, setOrgDocsOpen] = useState(false)
	const [docPreview, setDocPreview] = useState<{ src: string; name: string; isImg: boolean } | null>(null)

	const visibleDefaultDocs = defaultDocs.filter((d) => !d.is_hidden_by_org)

	return (
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
							{visibleDefaultDocs.map((doc) => (
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
								</button>
							))}
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
							{orgDocs.map((doc) => (
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
								</button>
							))}
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
	)
}
