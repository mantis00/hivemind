'use client'

import { useMemo, useState } from 'react'
import type { SpeciesDetail } from './types'
import { SpeciesFilters } from './species-filters'
import { SpeciesGrid } from './species-grid'
import { SpeciesDetailPanel } from './species-detail'
import { PageSplit } from '@/components/layout/page-split'

const mockSpecies: SpeciesDetail[] = [
	{
		id: 1,
		commonName: 'Giant Asian Mantis',
		scientificName: 'Hierodula membranacea',
		difficulty: 'Level 2',
		temperature: '72-86 F',
		humidity: '40-65%',
		grouping: 'Solitary',
		origin: 'Southeast Asia',
		generalInfo: ['Lifespan: 1-2 years', 'Instars: 7', 'Sexable at L4'],
		environment: ['Temperature: 72-86 F', 'Humidity: 40-65%', 'Substrate: Thin coco fiber', 'Water: droplets'],
		diet: ['Fruit flies, house flies, wax moths', 'Mist twice daily', 'Avoid crickets'],
		breeding: ['Sexual reproduction', 'Ootheca hatches in 4-6 weeks'],
		notes: ['Do not overfeed', 'Check for ooths']
	},
	{
		id: 2,
		commonName: 'Blue Death Feigning Beetle',
		scientificName: 'Asbolus verrucosus',
		difficulty: 'Level 1',
		temperature: '75-85 F',
		humidity: '20-40%',
		grouping: 'Group',
		origin: 'Southwest US',
		generalInfo: ['Lifespan: 6-10 years', 'Hardy species'],
		environment: ['Dry substrate', 'Minimal misting'],
		diet: ['Vegetable scraps', 'Leaf litter'],
		breeding: ['Slow breeding cycle'],
		notes: ['Handle gently']
	},
	{
		id: 3,
		commonName: 'Hissing Cockroach',
		scientificName: 'Gromphadorhina portentosa',
		difficulty: 'Level 1',
		temperature: '78-82 F',
		humidity: '60-70%',
		grouping: 'Group',
		origin: 'Madagascar',
		generalInfo: ['Large colony species'],
		environment: ['Coco fiber substrate', 'Misting daily'],
		diet: ['Leafy greens', 'Fruit'],
		breeding: ['Live birth'],
		notes: ['Check population weekly']
	},
	{
		id: 4,
		commonName: 'Texas Brown Tarantula',
		scientificName: 'Aphonopelma hentzi',
		difficulty: 'Level 3',
		temperature: '74-80 F',
		humidity: '50-60%',
		grouping: 'Solitary',
		origin: 'Texas',
		generalInfo: ['Lifespan: 15-25 years'],
		environment: ['Deep substrate', 'Hide required'],
		diet: ['Crickets, roaches'],
		breeding: ['Seasonal'],
		notes: ['Avoid handling']
	}
]

export function SpeciesPage() {
	const [selectedId, setSelectedId] = useState<number>(mockSpecies[0].id)
	const selected = useMemo(() => mockSpecies.find((item) => item.id === selectedId) ?? mockSpecies[0], [selectedId])

	return (
		<div className='space-y-4 flex flex-col min-h-0'>
			<SpeciesFilters />
			<PageSplit
				rightWidth='520px'
				left={<SpeciesGrid items={mockSpecies} selectedId={selected.id} onSelect={setSelectedId} className='h-full' />}
				right={<SpeciesDetailPanel species={selected} />}
			/>
		</div>
	)
}
