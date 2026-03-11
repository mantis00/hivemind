// import { NextResponse } from 'next/server'
// import { createClient } from '@/lib/supabase/server'
// import { numberToAlphaCode } from '@/lib/utils'

// export async function GET(
//   request: Request,
//   { params }: { params: { orgId: string } }
// ) {
//   const orgId = params.orgId

//   const supabase = await createClient()

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
//     return NextResponse.json({ error: error.message }, { status: 500 })
//   }

//   const headers = ['alpha_code', 'scientific_name', 'url']

//   const rows = data.map((enc: any, index: number) => {
//     // Extract enclosure number from name
//     const match = enc.name.match(/Enclosure (\d+)$/)
//     const enclosureNumber = match ? parseInt(match[1], 10) : index

//     const alpha = numberToAlphaCode(enclosureNumber)

//     const url = `${process.env.NEXT_PUBLIC_SITE_URL}/protected/orgs/${orgId}/enclosures/${enc.id}`

//     return [
//             alpha,
//             enc.species?.scientific_name ?? '',
//             url
//         ]
//     })

//   const csv = [
//     headers.join(','),
//     ...rows.map((row) => row.join(','))
//   ].join('\n')

//   return new NextResponse(csv, {
//     headers: {
//       'Content-Type': 'text/csv',
//       'Content-Disposition': 'attachment; filename="enclosures.csv"',
//     },
//   })
// }





import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { numberToAlphaCode } from '@/lib/utils'

export async function GET(
  request: Request,
  { params }: { params: { orgId: string } }
) {
  const orgId = params.orgId

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('enclosures')
    .select(`
      id,
      name,
      species:species_id (
        scientific_name
      )
    `)
    .eq('org_id', orgId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const headers = ['alpha_code', 'scientific_name', 'url']

  const rows = data.map((enc: any, index: number) => {
    const match = enc.name?.match(/Enclosure (\d+)$/)

    const enclosureNumber = match
      ? parseInt(match[1], 10)
      : index + 1

    const alpha = numberToAlphaCode(enclosureNumber)

    const url = `${process.env.NEXT_PUBLIC_SITE_URL}/protected/orgs/${orgId}/enclosures/${enc.id}`

    return [
      alpha,
      enc.species?.scientific_name ?? '',
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