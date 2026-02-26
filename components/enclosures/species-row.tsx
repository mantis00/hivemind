'use client'
import { type OrgSpecies, type Enclosure, useOrgEnclosuresForSpecies } from '@/lib/react-query/queries'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Card, CardContent } from '../ui/card'
import { Bug, ChevronRight, ClipboardCheck, ListChecks } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { EnclosureCard } from './enclosure-card'
import { Virtuoso } from 'react-virtuoso'
import { EnclosureDialog } from './enclosure-dialog'
import { UUID } from 'crypto'
import SpeciesDropdown from './species-settings-dropdown'

export default function SpeciesRow({ species }: { species: OrgSpecies }) {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const router = useRouter()

	const [isOpen, setIsOpen] = useState(false)
	const [selectedEnclosure, setSelectedEnclosure] = useState<Enclosure | null>(null)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [selectMode, setSelectMode] = useState(false)
	const [selectedIds, setSelectedIds] = useState<Set<UUID>>(new Set())

	const { data: useEnclosures } = useOrgEnclosuresForSpecies(orgId as UUID, species.id)

	// Derive the latest enclosure data from the query cache so the dialog always shows fresh data
	const currentEnclosure = selectedEnclosure
		? (useEnclosures?.find((e) => e.id === selectedEnclosure.id) ?? selectedEnclosure)
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

	const handleCompare = () => {
		const ids = Array.from(selectedIds).join(',')
		// router.push(`/protected/orgs/${orgId}/enclosures/compare?ids=${ids}`)
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
							<button className='flex flex-1 items-center gap-3 text-left' type='button'>
								<ChevronRight
									className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
										isOpen ? 'rotate-90' : ''
									}`}
								/>
								<Bug className='h-5 w-5 shrink-0 text-muted-foreground' />
								<div className='flex-1 min-w-0'>
									<div className='flex items-center gap-2'>
										<p className='font-medium text-sm truncate'>{species.custom_common_name}</p>
										<Badge variant='outline' className='shrink-0 text-xs'>
											{useEnclosures?.length} {useEnclosures?.length === 1 ? 'enclosure' : 'enclosures'}
										</Badge>
									</div>
									<p className='text-xs text-muted-foreground italic truncate'>{species.species.scientific_name}</p>
								</div>
							</button>
						</CollapsibleTrigger>
						{/* <FlaskConical className='h-4 w-4 shrink-0 text-muted-foreground' /> */}
						<SpeciesDropdown species={species} />
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
									<ListChecks className='h-3.5 w-3.5' />
									{selectMode ? 'Cancel Selection' : 'Select Enclosures'}
								</Button>
								{selectMode && selectedIds.size >= 2 && (
									<Button size='sm' className='gap-1.5 text-xs' onClick={handleCompare}>
										<ClipboardCheck className='h-3.5 w-3.5' />
										Compare Tasks ({selectedIds.size})
									</Button>
								)}
								{selectMode && (
									<span className='text-xs text-muted-foreground ml-auto'>{selectedIds.size} selected</span>
								)}
							</div>

							{/* Care instructions */}
							<div className='mb-3 rounded-md bg-muted p-3'>
								<p className='text-xs font-medium text-muted-foreground mb-1'>Care Instructions</p>
								<p className='text-xs leading-relaxed'>{species.custom_care_instructions}</p>
							</div>

							{/* Enclosures Virtuoso list */}
							{useEnclosures?.length && useEnclosures?.length > 0 ? (
								<div className='rounded-md border bg-background'>
									<Virtuoso
										style={{
											height:
												useEnclosures?.length && useEnclosures?.length <= 4
													? `${useEnclosures?.length * 114}px`
													: '352px'
										}}
										data={useEnclosures}
										itemContent={(index, enclosure) => (
											<div className='p-1 pb-0 last:pb-2'>
												<EnclosureCard
													enclosure={enclosure}
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
		</>
	)
}
