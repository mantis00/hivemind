'use client'
import { type OrgSpecies, type Enclosure, useOrgEnclosuresForSpecies } from '@/lib/react-query/queries'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Card, CardContent } from '../ui/card'
import { Bug, ChevronRight, EyeIcon, ListChecks, TrashIcon, X } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { EnclosureCard } from './enclosure-card'
import { Virtuoso } from 'react-virtuoso'
import { EnclosureDialog } from './enclosure-dialog'
import { ResponsiveDialogDrawer } from '../ui/dialog-to-drawer'
import { UUID } from 'crypto'
import { useIsMobile } from '@/hooks/use-mobile'
import { useBatchDeleteEnclosures } from '@/lib/react-query/mutations'

export default function SpeciesRow({ species }: { species: OrgSpecies }) {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const router = useRouter()
	const isMobile = useIsMobile()

	const { data: enclosures } = useOrgEnclosuresForSpecies(orgId as UUID, species.id)

	const [isOpen, setIsOpen] = useState(false)
	const [selectedEnclosure, setSelectedEnclosure] = useState<Enclosure | null>(null)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [selectMode, setSelectMode] = useState(false)
	const [selectedIds, setSelectedIds] = useState<Set<UUID>>(new Set())
	const [detailsOpen, setDetailsOpen] = useState(false)

	const batchDeleteMutation = useBatchDeleteEnclosures()

	// Derive the latest enclosure data from the passed list so the dialog always shows fresh data
	const currentEnclosure = selectedEnclosure
		? (enclosures?.find((e) => e.id === selectedEnclosure.id) ?? selectedEnclosure)
		: null

	const handleEnclosureClick = (enclosure: Enclosure) => {
		setSelectedEnclosure(enclosure)
		setDialogOpen(true)
	}

	const handleSelectChange = (enclosureId: UUID, checked: boolean) => {
		setSelectedIds((prev) => {
			const next = new Set(prev)
			if (checked) {
				next.add(enclosureId)
			} else {
				next.delete(enclosureId)
			}
			return next
		})
	}

	const handleDelete = () => {
		if (selectedIds.size === 0 || !orgId) return

		const confirmed = window.confirm(
			`Are you sure you want to delete ${selectedIds.size} enclosure${selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.`
		)
		if (!confirmed) return

		batchDeleteMutation.mutate(
			{ ids: Array.from(selectedIds), orgId },
			{
				onSuccess: () => {
					setSelectedIds(new Set())
					setSelectMode(false)
				},
				onError: (err) => {
					console.error('Failed to delete enclosures:', err)
					alert('Failed to delete enclosures')
				}
			}
		)
	}

	const toggleSelectMode = () => {
		setSelectMode((prev) => !prev)
		if (selectMode) {
			setSelectedIds(new Set())
		}
	}

	return (
		<>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<Card className='overflow-hidden py-2'>
					<CardContent className='p-2 flex items-center gap-3 hover:bg-accent/50 transition-colors'>
						<CollapsibleTrigger asChild>
							<button className='flex flex-1 min-w-0 items-center gap-3 text-left' type='button'>
								<ChevronRight
									className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
										isOpen ? 'rotate-90' : ''
									}`}
								/>
								{species.species.picture_url ? (
									<img
										src={species.species.picture_url}
										alt={species.custom_common_name}
										className='h-8 w-8 rounded-md object-cover shrink-0 border'
									/>
								) : (
									<div className='h-8 w-8 rounded-md border flex items-center justify-center shrink-0 bg-muted'>
										<Bug className='h-4 w-4 text-muted-foreground' />
									</div>
								)}
								<div className='flex-1 min-w-0'>
									<div className='flex items-center gap-2'>
										<p className='font-medium text-sm truncate'>{species.custom_common_name}</p>
										<Badge variant='outline' className='shrink-0 text-xs'>
											{enclosures?.length} {enclosures?.length === 1 ? 'enclosure' : 'enclosures'}
										</Badge>
									</div>
									<p className='text-xs text-muted-foreground italic truncate'>{species.species.scientific_name}</p>
								</div>
							</button>
						</CollapsibleTrigger>
						<Button
							size='sm'
							className='gap-1.5 h-7 text-xs shrink-0 mr-1'
							onClick={(e) => {
								e.stopPropagation()
								setDetailsOpen(true)
							}}
						>
							<EyeIcon className='h-3.5 w-3.5' />
						</Button>
					</CardContent>

					<CollapsibleContent>
						<div className='border-t bg-muted/30 p-2'>
							{/* Select mode controls */}
							<div className='flex items-center gap-2 mb-3'>
								<Button
									variant={selectMode ? 'secondary' : 'outline'}
									size='sm'
									className='gap-1.5 text-xs'
									onClick={toggleSelectMode}
								>
									{selectMode ? <X className='h-3.5 w-3.5' /> : <ListChecks className='h-3.5 w-3.5' />}
									{selectMode ? (isMobile ? 'Cancel' : 'Cancel Selection') : isMobile ? 'Select' : 'Select Enclosures'}
								</Button>
								{selectMode && selectedIds.size >= 1 && (
									<div className='flex w-full items-center gap-2'>
										<div className='text-muted-foreground text-xs ml-auto'>Selected: {selectedIds.size}</div>
										<div>
											<Button
												size='sm'
												variant='destructive'
												className='gap-1.5 text-xs'
												onClick={handleDelete}
												disabled={batchDeleteMutation.isPending}
											>
												<TrashIcon className='h-3.5 w-3.5' />
												{batchDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
											</Button>
										</div>
									</div>
								)}
							</div>

							{/* Enclosures Virtuoso list */}
							{enclosures?.length && enclosures?.length > 0 ? (
								<div className='rounded-md border bg-background'>
									<Virtuoso
										style={{
											height: enclosures?.length && enclosures?.length <= 4 ? `${enclosures?.length * 114}px` : '352px'
										}}
										data={enclosures}
										itemContent={(index, enclosure) => (
											<div className='p-1 pb-0 last:pb-2'>
												<EnclosureCard
													enclosure={enclosure}
													species={species}
													onClick={() => handleEnclosureClick(enclosure)}
													selectable={selectMode}
													selected={selectedIds.has(enclosure.id)}
													onSelectChange={(checked) => handleSelectChange(enclosure.id, checked)}
												/>
											</div>
										)}
									/>
								</div>
							) : (
								<div className='rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground'>
									No enclosures for this species.
								</div>
							)}
						</div>
					</CollapsibleContent>
				</Card>
			</Collapsible>

			{currentEnclosure && (
				<EnclosureDialog
					enclosure={currentEnclosure as Enclosure}
					species={species}
					open={dialogOpen}
					onOpenChange={setDialogOpen}
				/>
			)}

			<ResponsiveDialogDrawer
				title={species.custom_common_name}
				description={species.species.scientific_name}
				open={detailsOpen}
				onOpenChange={setDetailsOpen}
				trigger={<span className='hidden' />}
			>
				<div className='flex flex-col gap-4'>
					{species.species.picture_url ? (
						<img
							src={species.species.picture_url}
							alt={species.custom_common_name}
							className='rounded-md max-h-48 w-full object-contain mx-auto'
						/>
					) : (
						<div className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
							No image available
						</div>
					)}
					<div className='rounded-md bg-muted p-3'>
						<p className='text-xs font-medium text-muted-foreground mb-1'>Care Instructions</p>
						<p className='text-sm leading-relaxed'>{species.custom_care_instructions}</p>
					</div>
				</div>
			</ResponsiveDialogDrawer>
		</>
	)
}
