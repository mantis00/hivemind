'use client'
import { type OrgSpecies, type Enclosure, useOrgEnclosuresForSpecies } from '@/lib/react-query/queries'
import { useParams } from 'next/navigation'
import { useState } from 'react'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Card, CardContent } from '../ui/card'
import { Bug, ChevronRight, FlaskConical } from 'lucide-react'
import { Badge } from '../ui/badge'
import { EnclosureCard } from './enclosure-card'
import { Virtuoso } from 'react-virtuoso'
import { EnclosureDialog } from './enclosure-dialog'

export default function SpeciesRow({ species }: { species: OrgSpecies }) {
	const params = useParams()
	const orgId = params?.orgId as number | undefined

	const [isOpen, setIsOpen] = useState(false)
	const [selectedEnclosure, setSelectedEnclosure] = useState<Enclosure | null>(null)
	const [dialogOpen, setDialogOpen] = useState(false)

	const { data: useEnclosures } = useOrgEnclosuresForSpecies(orgId as number, species.id)

	// Derive the latest enclosure data from the query cache so the dialog always shows fresh data
	const currentEnclosure = selectedEnclosure
		? (useEnclosures?.find((e) => e.id === selectedEnclosure.id) ?? selectedEnclosure)
		: null

	const handleEnclosureClick = (enclosure: Enclosure) => {
		setSelectedEnclosure(enclosure)
		setDialogOpen(true)
	}

	console.log('SpeciesRow render', species)

	return (
		<>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<Card className='overflow-hidden py-2'>
					<CollapsibleTrigger asChild>
						<button className='w-full text-left' type='button'>
							<CardContent className='p-2 flex items-center gap-3 hover:bg-accent/50 transition-colors'>
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
								<FlaskConical className='h-4 w-4 shrink-0 text-muted-foreground' />
							</CardContent>
						</button>
					</CollapsibleTrigger>

					<CollapsibleContent>
						<div className='border-t bg-muted/30 p-2'>
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
												<EnclosureCard enclosure={enclosure} onClick={() => handleEnclosureClick(enclosure)} />
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
