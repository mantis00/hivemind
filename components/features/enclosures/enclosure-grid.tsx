'use client'

import { cn } from '@/lib/utils'
import type { EnclosureSummary } from './types'
import { EnclosureCard } from './enclosure-card'

export function EnclosureGrid({
	items,
	selectedId,
	onSelect,
	className
}: {
	items: EnclosureSummary[]
	selectedId?: number
	onSelect: (id: number) => void
	className?: string
}) {
	return (
		<div className={cn('rounded-xl border bg-muted/20', className)}>
			<div className='h-full overflow-y-auto p-4'>
				<div className='grid grid-cols-2 gap-4'>
					{items.map((enclosure) => (
						<EnclosureCard
							key={enclosure.id}
							enclosure={enclosure}
							selected={enclosure.id === selectedId}
							onClick={() => onSelect(enclosure.id)}
						/>
					))}
				</div>
			</div>
		</div>
	)
}
