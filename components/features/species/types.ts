export type SpeciesSummary = {
	id: number
	commonName: string
	scientificName: string
	difficulty: string
	temperature: string
	humidity: string
	grouping: string
}

export type SpeciesDetail = SpeciesSummary & {
	origin: string
	generalInfo: string[]
	environment: string[]
	diet: string[]
	breeding: string[]
	notes: string[]
}
