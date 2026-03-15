'use client'
import { type OrgSpecies, type Enclosure, useOrgEnclosuresForSpecies } from '@/lib/react-query/queries'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { useState } from 'react'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Card, CardContent } from '../ui/card'
import { Bug, ChevronRight, EyeIcon } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { EnclosureCard } from './enclosure-card'
import { Virtuoso } from 'react-virtuoso'
import { EnclosureDialog } from './enclosure-dialog'
import { ResponsiveDialogDrawer } from '../ui/dialog-to-drawer'
import { UUID } from 'crypto'

export default function SpeciesRow({
	species,
	onDetailsOpenChange,
	sortKey,
	enclosureStatusFilter,
	selectMode,
	selectedIds,
	onSelectChange
}: {
	species: OrgSpecies
	onDetailsOpenChange: () => void
	sortKey: string
	enclosureStatusFilter: 'active' | 'inactive' | 'all'
	selectMode: boolean
	selectedIds: Set<UUID>
	onSelectChange: (enclosureId: UUID, checked: boolean) => void
}) {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined

	const { data: enclosures } = useOrgEnclosuresForSpecies(orgId as UUID, species.id, enclosureStatusFilter)

	const [isOpen, setIsOpen] = useState(false)
	const [selectedEnclosure, setSelectedEnclosure] = useState<Enclosure | null>(null)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [detailsOpen, setDetailsOpen] = useState(false)

	// Derive the latest enclosure data from the passed list so the dialog always shows fresh data
	const currentEnclosure = selectedEnclosure
		? (enclosures?.find((e) => e.id === selectedEnclosure.id) ?? selectedEnclosure)
		: null

	const handleEnclosureClick = (enclosure: Enclosure) => {
		setSelectedEnclosure(enclosure)
		setDialogOpen(true)
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
								{species.species?.picture_url ? (
									<Image
										src={species.species.picture_url}
										alt={species.custom_common_name ?? ''}
										width={40}
										height={40}
										className='h-10 w-10 rounded-md object-cover shrink-0 border'
									/>
								) : (
									<div className='h-10 w-10 rounded-md border flex items-center justify-center shrink-0 bg-muted'>
										<Bug className='h-5 w-5 text-muted-foreground' />
									</div>
								)}
								<div className='flex-1 min-w-0'>
									<div className='flex items-center gap-2'>
										{sortKey === 'scientific_name' ? (
											<p className='font-medium text-sm truncate'>{species.species?.scientific_name}</p>
										) : (
											<p className='font-medium text-sm truncate'>{species.custom_common_name}</p>
										)}
										<Badge variant='outline' className='shrink-0 text-xs'>
											{enclosures?.length} {enclosures?.length === 1 ? 'enclosure' : 'enclosures'}
										</Badge>
									</div>
									{sortKey === 'scientific_name' ? (
										<p className='text-xs text-muted-foreground italic truncate'>{species.custom_common_name}</p>
									) : (
										<p className='text-xs text-muted-foreground italic truncate'>{species.species?.scientific_name}</p>
									)}
								</div>
							</button>
						</CollapsibleTrigger>
						<Button
							size='sm'
							className='gap-1.5 h-7 text-xs shrink-0 mr-1'
							onClick={(e) => {
								e.stopPropagation()
								onDetailsOpenChange()
							}}
						>
							<EyeIcon className='h-3.5 w-3.5' />
						</Button>
					</CardContent>

					<CollapsibleContent>
						<div className='border-t bg-muted/30 p-2'>
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
													onClick={() => handleEnclosureClick(enclosure)}
													selectable={selectMode}
													selected={selectedIds.has(enclosure.id)}
													onSelectChange={(checked) => onSelectChange(enclosure.id, checked)}
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
				description={species.species?.scientific_name}
				open={detailsOpen}
				onOpenChange={setDetailsOpen}
				trigger={<span className='hidden' />}
			>
				<div className='flex flex-col gap-4'>
					{species.species?.picture_url ? (
						<Image
							src={species.species.picture_url}
							alt={species.custom_common_name ?? ''}
							width={600}
							height={192}
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
