import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('enclosures')
    .select(`
      id,
      alpha_code,
      org_species:species_id (
        custom_common_name,
        species:master_species_id (
          scientific_name,
          common_name
        )
      )
    `)
    .eq('org_id', orgId)
    .limit(3000) // CSV row limit (needed by Avery)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const baseUrl = new URL(request.url).origin

  const headers = ['alpha_code', 'common_name', 'scientific_name', 'url']

  const rows = data.map((enc: any) => {
    const alpha = enc.alpha_code

    const species = enc.org_species?.species

    const scientificName = species?.scientific_name ?? ''

    const commonName =
      enc.org_species?.custom_common_name ||
      species?.common_name ||
      ''

    const url = `${baseUrl}/protected/orgs/${orgId}/enclosures/${enc.id}`

    return [
      alpha,
      `"${commonName}"`,
      `"${scientificName}"`,
      url
    ]
  })

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.join(','))
  ].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="enclosures.csv"',
    },
  })
}