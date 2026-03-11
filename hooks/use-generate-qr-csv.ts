//hooks/use-generate-qr-csv.ts

// import { createClient } from '@/lib/supabase/client'
// import { numberToAlphaCode } from '@/lib/utils'

// export async function generateQrCsv(orgId: string) {
//   const supabase = createClient()

//   const { data, error } = await supabase
//     .from('enclosures')
//     .select(`
//       id,
//       name,
//       species:species_id (
//         scientific_name
//       )
//     `)
//     .eq('org_id', orgId)

//   if (error) {
//     console.error('Error fetching enclosures:', error)
//     return
//   }

//   if (!data || data.length === 0) {
//     alert('No enclosures found for this organization.')
//     return
//   }

//   const headers = ['alpha_code', 'scientific_name', 'url']

//   const rows = data.map((enc: any, index: number) => {
//     const alpha = numberToAlphaCode(index)

//     const url = `${window.location.origin}/protected/orgs/${orgId}/enclosures/${enc.id}`

//     return [
//       alpha,
//       enc.species?.scientific_name ?? '',
//       url
//     ]
//   })

//   const csv = [
//     headers.join(','),
//     ...rows.map((row) => row.join(','))
//   ].join('\n')

//   const blob = new Blob([csv], { type: 'text/csv' })
//   const downloadUrl = URL.createObjectURL(blob)

//   const a = document.createElement('a')
//   a.href = downloadUrl
//   a.download = 'enclosures.csv'
//   a.click()

//   URL.revokeObjectURL(downloadUrl)
// }

// export async function generateQrCsv(orgId: string) {
//   const response = await fetch(`/api/orgs/${orgId}/exportQR`)

//   const blob = await response.blob()

//   const url = window.URL.createObjectURL(blob)

//   const a = document.createElement('a')
//   a.href = url
//   a.download = 'enclosures.csv'
//   a.click()

//   window.URL.revokeObjectURL(url)
// }

export async function generateQrCsv(orgId: string) {
	const response = await fetch(`/api/orgs/${orgId}/exportQR`)

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
