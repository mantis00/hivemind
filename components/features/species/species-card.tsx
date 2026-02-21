'use client'

import type { SpeciesSummary } from './types'

export function SpeciesCard({
	species,
	selected,
	onClick
}: {
	species: SpeciesSummary
	selected?: boolean
	onClick?: () => void
}) {
	return (
		<button
			type='button'
			onClick={onClick}
			className={`rounded-xl border-2 bg-muted/50 px-4 py-4 text-left shadow-sm transition hover:bg-muted ${
				selected ? 'border-sky-400 ring-2 ring-sky-400' : 'border-sky-400'
			}`}
		>
			<div className='text-sm font-semibold'>{species.commonName}</div>
			<div className='text-xs text-muted-foreground italic'>{species.scientificName}</div>
			<div className='mt-2 text-xs text-muted-foreground'>Difficulty: {species.difficulty}</div>
			<div className='mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground'>
				<div>Temp: {species.temperature}</div>
				<div>Humidity: {species.humidity}</div>
				<div>Group: {species.grouping}</div>
				<div className='rounded border bg-background px-2 py-1 text-center text-[10px]'>image</div>
			</div>
		</button>
	)
}
