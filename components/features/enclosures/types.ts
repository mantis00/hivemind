export type EnclosureUrgency = 'low' | 'med' | 'high' | 'critical'

export type EnclosureSummary = {
	id: number
	name: string
	species: string
	caretaker?: string
	urgency?: EnclosureUrgency
}

export type EnclosureEvent = {
	id: string
	timestamp: string
	caretaker: string
	description: string
}

export type EnclosureDetail = EnclosureSummary & {
	scientificName?: string
	populationCount?: number
	adults?: number
	nymphs?: number
	generalInfo: { label: string; value: string }[]
	notes?: string[]
	recentEvents: EnclosureEvent[]
}
