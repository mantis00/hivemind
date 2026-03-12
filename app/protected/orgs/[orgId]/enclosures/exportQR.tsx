'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import { generateQrCsv } from '@/hooks/use-generate-qr-csv'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Button } from '@/components/ui/button'

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

		await generateQrCsv(orgId, filters)
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
					<label className='text-sm font-medium'>Sort by</label>

					<select
						className='w-full border rounded-md p-2 bg-white text-black'
						value={filters.sort}
						onChange={(e) =>
							setFilters({
								...filters,
								sort: e.target.value as SortOptions
							})
						}
					>
						<option value='none'>None</option>
						<option value='alpha'>Alpha Code (A → Z)</option>
						<option value='alpha_desc'>Alpha Code (Z → A)</option>
						<option value='common'>Common Name (A → Z)</option>
						<option value='common_desc'>Common Name (Z → A)</option>
						<option value='scientific'>Scientific Name (A → Z)</option>
						<option value='scientific_desc'>Scientific Name (Z → A)</option>
					</select>
				</div>

				{/* Printed filter */}
				<div>
					<label className='text-sm font-medium'>Printed Status</label>

					<select
						className='w-full border rounded-md p-2 bg-white text-black'
						value={filters.printed}
						onChange={(e) =>
							setFilters({
								...filters,
								printed: e.target.value as PrintedFilter
							})
						}
					>
						<option value='all'>All</option>
						<option value='printed'>Printed</option>
						<option value='unprinted'>Not Printed</option>
					</select>
				</div>

				{/* Row limit */}
				<div>
					<label className='text-sm font-medium'>Count (max 3000)</label>

					<input
						type='number'
						min={1}
						max={3000}
						className='w-full border rounded-md p-2'
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
					<label className='text-sm font-medium'>Search</label>

					<input
						type='text'
						placeholder='Search enclosures...'
						className='w-full border rounded-md p-2'
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
					<label className='text-sm font-medium'>Search By</label>

					<select
						className='w-full border rounded-md p-2 bg-white text-black'
						value={filters.searchType}
						onChange={(e) =>
							setFilters({
								...filters,
								searchType: e.target.value as SearchType
							})
						}
					>
						<option value='any'>Any</option>
						<option value='alpha'>Alpha Code</option>
						<option value='scientific'>Scientific Name</option>
						<option value='common'>Common Name</option>
					</select>
				</div>
			</div>
		</ResponsiveDialogDrawer>
	)
}
