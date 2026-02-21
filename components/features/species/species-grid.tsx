'use client'

import { cn } from '@/lib/utils'
import type { SpeciesSummary } from './types'
import { SpeciesCard } from './species-card'

export function SpeciesGrid({
	items,
	selectedId,
	onSelect,
	className
}: {
	items: SpeciesSummary[]
	selectedId?: number
	onSelect: (id: number) => void
	className?: string
}) {
	return (
		<div className={cn('rounded-xl border bg-muted/20', className)}>
			<div className='h-full overflow-y-auto p-4'>
				<div className='grid grid-cols-2 gap-4'>
					{items.map((species) => (
						<SpeciesCard
							key={species.id}
							species={species}
							selected={species.id === selectedId}
							onClick={() => onSelect(species.id)}
						/>
					))}
				</div>
			</div>
		</div>
	)
}
