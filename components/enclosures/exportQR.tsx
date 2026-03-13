'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
//import { generateQrCsv } from '@/hooks/use-generate-qr-csv'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { getEnclosuresByIds } from '@/lib/react-query/queries'
import { markEnclosuresPrinted } from '@/lib/react-query/mutations'

export default function ExportQR() {
	const params = useParams()
	const orgId = params?.orgId as string

	type SortOptions = 'none' | 'alpha' | 'alpha_desc' | 'common' | 'common_desc' | 'scientific' | 'scientific_desc'
	type PrintedFilter = 'all' | 'printed' | 'unprinted'
	type SearchType = 'any' | 'alpha' | 'common' | 'scientific'

	const [filters, setFilters] = useState<{
		sort: SortOptions
		printed: PrintedFilter
		limit: number
		search: string
		searchType: SearchType
	}>({
		sort: 'none',
		printed: 'all',
		limit: 100,
		search: '',
		searchType: 'any'
	})

	const handleExport = async () => {
		if (!orgId) {
			console.error('orgId is undefined')
			return
		}

		try {
			const supabase = createClient()

			// fetch enclosures using your filters
			const data = await getEnclosuresByIds(supabase, orgId, filters)

			if (!data || data.length === 0) {
				console.warn('No enclosures found')
				return
			}

			// mark them printed
			const ids = data.map((enc: any) => enc.id)

			await markEnclosuresPrinted(supabase, ids)

			const baseUrl = window.location.origin

			const headers = ['alpha_code', 'common_name', 'scientific_name', 'url']

			const rows = data.map((enc: any) => {
				const scientific = enc.org_species?.species?.scientific_name ?? ''

				const common = enc.org_species?.custom_common_name || enc.org_species?.species?.common_name || ''

				const url = `${baseUrl}/protected/orgs/${orgId}/enclosures/${enc.id}`

				return [enc.alpha_code, `"${common}"`, `"${scientific}"`, url]
			})

			const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

			const blob = new Blob([csv], { type: 'text/csv' })

			const url = URL.createObjectURL(blob)

			const a = document.createElement('a')
			a.href = url
			a.download = 'enclosures.csv'
			a.click()

			URL.revokeObjectURL(url)
		} catch (err) {
			console.error('CSV export failed', err)
		}
	}

	return (
		<ResponsiveDialogDrawer
			title='Export QR Codes'
			description='Generate a CSV file for enclosure QR labels.'
			trigger={<Button>Export QR CSV</Button>}
			footer={<Button onClick={handleExport}>Generate CSV</Button>}
		>
			<div className='space-y-4'>
				{/* Sort */}
				<div>
					<Label>Sort by</Label>

					<Select
						value={filters.sort}
						onValueChange={(value) =>
							setFilters({
								...filters,
								sort: value as SortOptions
							})
						}
					>
						<SelectTrigger className='w-full'>
							<SelectValue placeholder='Select sort option' />
						</SelectTrigger>

						<SelectContent>
							<SelectItem value='none'>None</SelectItem>
							<SelectItem value='alpha'>Alpha Code (A → Z)</SelectItem>
							<SelectItem value='alpha_desc'>Alpha Code (Z → A)</SelectItem>
							<SelectItem value='common'>Common Name (A → Z)</SelectItem>
							<SelectItem value='common_desc'>Common Name (Z → A)</SelectItem>
							<SelectItem value='scientific'>Scientific Name (A → Z)</SelectItem>
							<SelectItem value='scientific_desc'>Scientific Name (Z → A)</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Printed filter */}
				<div>
					<Label>Printed Status</Label>

					<Select
						value={filters.printed}
						onValueChange={(value) =>
							setFilters({
								...filters,
								printed: value as PrintedFilter
							})
						}
					>
						<SelectTrigger className='w-full'>
							<SelectValue />
						</SelectTrigger>

						<SelectContent>
							<SelectItem value='all'>All</SelectItem>
							<SelectItem value='printed'>Printed</SelectItem>
							<SelectItem value='unprinted'>Not Printed</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Row limit */}
				<div>
					<Label>Number of enclosures (max 3000)</Label>

					<Input
						type='number'
						min={1}
						max={3000}
						value={filters.limit}
						onChange={(e) => {
							let value = Number(e.target.value)

							if (value > 3000) value = 3000
							if (value < 1) value = 1

							setFilters({
								...filters,
								limit: value
							})
						}}
					/>
				</div>

				{/* Search */}
				<div>
					<Label>Search</Label>

					<Input
						placeholder='Search enclosures...'
						value={filters.search}
						onChange={(e) =>
							setFilters({
								...filters,
								search: e.target.value
							})
						}
					/>
				</div>

				{/* Search type */}
				<div>
					<Label>Search By</Label>

					<Select
						value={filters.searchType}
						onValueChange={(value) =>
							setFilters({
								...filters,
								searchType: value as SearchType
							})
						}
					>
						<SelectTrigger className='w-full'>
							<SelectValue />
						</SelectTrigger>

						<SelectContent>
							<SelectItem value='any'>Any</SelectItem>
							<SelectItem value='alpha'>Alpha Code</SelectItem>
							<SelectItem value='scientific'>Scientific Name</SelectItem>
							<SelectItem value='common'>Common Name</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
		</ResponsiveDialogDrawer>
	)
}
