'use client'

import { useMemo, useState } from 'react'
import type { EnclosureDetail } from './types'
import { EnclosureFilters } from './enclosure-filters'
import { EnclosureGrid } from './enclosure-grid'
import { EnclosureDetail as EnclosureDetailPanel } from './enclosure-detail'
import { PageSplit } from '@/components/layout/page-split'

const mockEnclosures: EnclosureDetail[] = [
	{
		id: 7,
		name: 'Tank 7',
		species: 'Hissing Cockroaches',
		scientificName: 'Gromphadorhina portentosa',
		caretaker: 'John Doe',
		populationCount: 72,
		adults: 40,
		nymphs: 32,
		urgency: 'high',
		generalInfo: [
			{ label: 'Target Temperature', value: '82°F' },
			{ label: 'Target Humidity', value: '70%' },
			{ label: 'Substrate', value: 'Coco Fiber & Bark' },
			{ label: 'Replacement Interval', value: 'Weekly' },
			{ label: 'Feeding Interval', value: 'Every 3 days' },
			{ label: 'Misting Interval', value: 'Daily' }
		],
		recentEvents: [
			{ id: 'evt-1', timestamp: 'Nov 14, 2025 • 10:04 AM', caretaker: 'Jane', description: 'Added note' },
			{ id: 'evt-2', timestamp: 'Nov 13, 2025 • 02:18 PM', caretaker: 'John', description: 'Cleaned enclosure' },
			{ id: 'evt-3', timestamp: 'Nov 12, 2025 • 09:45 AM', caretaker: 'Alex', description: 'Fed colony' }
		]
	},
	{
		id: 12,
		name: 'Tank 12',
		species: 'Giant Asian Mantis',
		scientificName: 'Hierodula membranacea',
		caretaker: 'Maya Lin',
		populationCount: 18,
		adults: 6,
		nymphs: 12,
		urgency: 'med',
		generalInfo: [
			{ label: 'Target Temperature', value: '78°F' },
			{ label: 'Target Humidity', value: '60%' },
			{ label: 'Substrate', value: 'Coco Fiber' },
			{ label: 'Diet', value: 'Fruit flies, moths' }
		],
		recentEvents: [{ id: 'evt-4', timestamp: 'Nov 14, 2025 • 08:15 AM', caretaker: 'Maya', description: 'Fed' }]
	},
	{
		id: 3,
		name: 'Tank 3',
		species: 'Blue Death Feigning Beetle',
		caretaker: 'Ava Smith',
		populationCount: 34,
		urgency: 'low',
		generalInfo: [
			{ label: 'Target Temperature', value: '78°F' },
			{ label: 'Target Humidity', value: '40%' }
		],
		recentEvents: []
	},
	{
		id: 18,
		name: 'Tank 18',
		species: 'Leafcutter Ants',
		caretaker: 'Kyle West',
		populationCount: 120,
		urgency: 'critical',
		generalInfo: [
			{ label: 'Target Temperature', value: '80°F' },
			{ label: 'Target Humidity', value: '80%' }
		],
		recentEvents: [
			{
				id: 'evt-5',
				timestamp: 'Nov 14, 2025 • 06:40 AM',
				caretaker: 'Kyle',
				description: 'Humidity alert acknowledged'
			}
		]
	},
	{
		id: 22,
		name: 'Tank 22',
		species: 'Texas Brown Tarantula',
		caretaker: 'Nia King',
		populationCount: 12,
		urgency: 'low',
		generalInfo: [
			{ label: 'Target Temperature', value: '76°F' },
			{ label: 'Target Humidity', value: '55%' }
		],
		recentEvents: []
	},
	{
		id: 31,
		name: 'Tank 31',
		species: 'African Giant Snail',
		caretaker: 'Marco Lane',
		populationCount: 15,
		urgency: 'med',
		generalInfo: [
			{ label: 'Target Temperature', value: '75°F' },
			{ label: 'Target Humidity', value: '85%' }
		],
		recentEvents: []
	}
]

export function EnclosuresPage() {
	const [selectedId, setSelectedId] = useState<number>(mockEnclosures[0].id)
	const selected = useMemo(
		() => mockEnclosures.find((item) => item.id === selectedId) ?? mockEnclosures[0],
		[selectedId]
	)

	return (
		<div className='space-y-4 flex flex-col min-h-0'>
			<EnclosureFilters />

			<PageSplit
				rightWidth='520px'
				left={
					<EnclosureGrid items={mockEnclosures} selectedId={selected.id} onSelect={setSelectedId} className='h-full' />
				}
				right={<EnclosureDetailPanel enclosure={selected} className='h-full' />}
			/>
		</div>
	)
}
