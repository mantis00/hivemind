// export async function generateQrCsv(
//   orgId: string,
//   filters: {
//     sort: SortOptions
//     printed: PrintedFilter
//   }
// ) {
//   const params = new URLSearchParams()

//   params.set('sort', filters.sort)
//   params.set('printed', filters.printed)

//   const response = await fetch(
//     `/api/orgs/${orgId}/exportQR?${params.toString()}`
//   )

//   if (!response.ok) {
//     const text = await response.text()
//     console.error('CSV API error:', text)
//     throw new Error(`Failed to generate CSV: ${text}`)
//   }

//   const blob = await response.blob()

//   const url = window.URL.createObjectURL(blob)

//   const a = document.createElement('a')
//   a.href = url
//   a.download = 'enclosures.csv'
//   a.click()

//   window.URL.revokeObjectURL(url)
// }

type SortOptions = 'none' | 'alpha' | 'alpha_desc' | 'common' | 'common_desc' | 'scientific' | 'scientific_desc'
type PrintedFilter = 'all' | 'printed' | 'unprinted'
type SearchType = 'any' | 'alpha' | 'scientific' | 'common'

export async function generateQrCsv(
	orgId: string,
	filters: {
		sort: SortOptions
		printed: PrintedFilter
		limit: number
		search: string
		searchType: SearchType
	}
) {
	const params = new URLSearchParams()

	params.set('sort', filters.sort)
	params.set('printed', filters.printed)
	params.set('limit', filters.limit.toString())

	if (filters.search) {
		params.set('search', filters.search)
	}

	params.set('searchType', filters.searchType)

	const response = await fetch(`/api/orgs/${orgId}/exportQR?${params.toString()}`)

	if (!response.ok) {
		const text = await response.text()
		console.error('CSV API error:', text)
		throw new Error(`Failed to generate CSV: ${text}`)
	}

	const blob = await response.blob()

	const url = window.URL.createObjectURL(blob)

	const a = document.createElement('a')
	a.href = url
	a.download = 'enclosures.csv'
	a.click()

	window.URL.revokeObjectURL(url)
}
