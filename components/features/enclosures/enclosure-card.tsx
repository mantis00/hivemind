'use client'

import { cn } from '@/lib/utils'
import type { EnclosureSummary } from './types'

const urgencyRing: Record<NonNullable<EnclosureSummary['urgency']>, string> = {
	low: 'border-sky-400',
	med: 'border-amber-400',
	high: 'border-orange-500',
	critical: 'border-red-500'
}

export function EnclosureCard({
	enclosure,
	selected,
	onClick
}: {
	enclosure: EnclosureSummary
	selected?: boolean
	onClick?: () => void
}) {
	const ringClass = enclosure.urgency ? urgencyRing[enclosure.urgency] : 'border-sky-400'

	return (
		<button
			type='button'
			onClick={onClick}
			className={cn(
				'rounded-xl border-2 bg-muted/50 px-4 py-6 text-center shadow-sm transition hover:bg-muted',
				ringClass,
				selected && 'ring-2 ring-sky-400'
			)}
		>
			<div className='text-sm text-muted-foreground'>{enclosure.name}</div>
			<div className='text-base font-semibold'>{enclosure.species}</div>
			<div className='text-xs text-muted-foreground'>{enclosure.caretaker ?? 'Unassigned'}</div>
		</button>
	)
}
