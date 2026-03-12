import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request, context: { params: Promise<{ orgId: string }> }) {
	const { orgId } = await context.params

	const supabase = await createClient()

	// Read filters from URL
	const { searchParams } = new URL(request.url)
	const sort = searchParams.get('sort') ?? 'alpha'
	const printed = searchParams.get('printed') ?? 'all'
	const limitParam = Number(searchParams.get('limit')) || 100
	const limit = Math.min(Math.max(limitParam, 1), 3000)

	// Base query
	let query = supabase
		.from('enclosures')
		.select(
			`
      id,
      alpha_code,
      printed,
      org_species:species_id (
        custom_common_name,
        species:master_species_id (
          scientific_name,
          common_name
        )
      )
    `
		)
		.eq('org_id', orgId)
		.limit(limit)

	// Apply printed filter
	if (printed === 'printed') {
		query = query.eq('printed', true)
	}

	if (printed === 'unprinted') {
		query = query.eq('printed', false)
	}

	// Alpha sorting handled by Supabase
	if (sort === 'alpha') {
		query = query.order('alpha_code', { ascending: true })
	}

	if (sort === 'alpha_desc') {
		query = query.order('alpha_code', { ascending: false })
	}

	const { data, error } = await query

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 })
	}

	// Helper functions
	const getScientificName = (enc: any) => enc.org_species?.species?.scientific_name ?? ''

	const getCommonName = (enc: any) => enc.org_species?.custom_common_name || enc.org_species?.species?.common_name || ''

	// Sort in JS when needed

	if (sort === 'common') {
		data.sort((a, b) => getCommonName(a).localeCompare(getCommonName(b)))
	}

	if (sort === 'common_desc') {
		data.sort((a, b) => getCommonName(b).localeCompare(getCommonName(a)))
	}

	if (sort === 'scientific') {
		data.sort((a, b) => getScientificName(a).localeCompare(getScientificName(b)))
	}

	if (sort === 'scientific_desc') {
		data.sort((a, b) => getScientificName(b).localeCompare(getScientificName(a)))
	}

	const enclosureIds = data?.map((enc: any) => enc.id) ?? []

	console.log('Updating printed for:', enclosureIds.length)

	const batchSize = 200

	for (let i = 0; i < enclosureIds.length; i += batchSize) {
		const batch = enclosureIds.slice(i, i + batchSize)

		const { error: updateError } = await supabase.from('enclosures').update({ printed: true }).in('id', batch)

		if (updateError) {
			console.error('Batch update error:', updateError)
		}
	}

	const baseUrl = new URL(request.url).origin

	const headers = ['alpha_code', 'common_name', 'scientific_name', 'url']

	const rows = data.map((enc: any) => {
		const alpha = enc.alpha_code

		const scientificName = getScientificName(enc)
		const commonName = getCommonName(enc)

		const url = `${baseUrl}/protected/orgs/${orgId}/enclosures/${enc.id}`

		return [alpha, `"${commonName}"`, `"${scientificName}"`, url]
	})

	const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

	return new NextResponse(csv, {
		headers: {
			'Content-Type': 'text/csv',
			'Content-Disposition': 'attachment; filename="enclosures.csv"'
		}
	})
}
