'use client'

import { useState } from 'react'
import { type Species } from '@/lib/react-query/queries'
import { Card, CardContent } from '@/components/ui/card'
import { Bug } from 'lucide-react'
import { EditSpeciesButton } from './edit-species-button'

export function SpeciesAdminRow({ species }: { species: Species }) {
	const [editOpen, setEditOpen] = useState(false)

	return (
		<>
			<Card
				className='overflow-hidden py-2 cursor-pointer transition-colors hover:bg-accent/50'
				onClick={() => setEditOpen(true)}
			>
				<CardContent className='p-2 flex items-center gap-3'>
					{species.picture_url ? (
						<img
							src={species.picture_url}
							alt={species.common_name}
							className='h-10 w-10 rounded-md object-cover shrink-0 border'
						/>
					) : (
						<div className='h-10 w-10 rounded-md border flex items-center justify-center shrink-0 bg-muted'>
							<Bug className='h-5 w-5 text-muted-foreground' />
						</div>
					)}

					<div className='flex-1 min-w-0'>
						<p className='font-medium text-sm truncate'>{species.common_name}</p>
						<p className='text-xs text-muted-foreground italic truncate'>{species.scientific_name}</p>
					</div>
				</CardContent>
			</Card>

			<EditSpeciesButton species={species} open={editOpen} onOpenChange={setEditOpen} />
		</>
	)
}
