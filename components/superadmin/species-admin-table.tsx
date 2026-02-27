'use client'

import { useState, useEffect } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { useAllSpecies, type Species } from '@/lib/react-query/queries'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { SpeciesAdminRow } from './species-admin-row'
import { CreateSpeciesDialog } from './create-species-dialog'

const MAX_HEIGHT = 600
const ROW_HEIGHT = 74

export function SpeciesAdminTable() {
	const { data: allSpecies, isLoading } = useAllSpecies()
	const [search, setSearch] = useState('')
	const [searchCount, setSearchCount] = useState(0)
	const [displayedSpecies, setDisplayedSpecies] = useState<Species[]>([])

	useEffect(() => {
		if (allSpecies && search.trim() === '') {
			setDisplayedSpecies(allSpecies)
		}
	}, [allSpecies, search])

	const handleSearch = () => {
		if (!search.trim()) {
			setDisplayedSpecies(allSpecies ?? [])
			setSearchCount(0)
			return
		}
		const val = search.trim().toLowerCase()
		const results = (allSpecies ?? []).filter(
			(s) => s.common_name?.toLowerCase().includes(val) || s.scientific_name?.toLowerCase().includes(val)
		)
		setDisplayedSpecies(results)
		setSearchCount(results.length)
	}

	const handleSearchChange = (val: string) => {
		setSearch(val)
		if (val.trim() === '') {
			setDisplayedSpecies(allSpecies ?? [])
			setSearchCount(0)
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			handleSearch()
		}
	}

	const containerHeight = Math.min((displayedSpecies.length || 1) * ROW_HEIGHT + 8, MAX_HEIGHT)

	return (
		<div className='space-y-3'>
			{/* Toolbar */}
			<div className='flex justify-between gap-3 items-center'>
				<Badge variant='secondary'>{allSpecies?.length ?? 0} species</Badge>
				<div className='flex flex-row items-center gap-3'>
					<CreateSpeciesDialog />
					<InputGroup className='w-40 sm:w-60 ml-auto' onKeyDown={handleKeyDown}>
						<InputGroupInput
							placeholder='Search…'
							value={search}
							onChange={(e) => handleSearchChange(e.target.value)}
						/>
						<InputGroupAddon>
							<InputGroupButton onClick={handleSearch} disabled={isLoading}>
								<Search />
							</InputGroupButton>
						</InputGroupAddon>
						<InputGroupAddon className='hidden sm:block' align='inline-end'>
							{searchCount > 0 ? `${searchCount} Results` : ''}
						</InputGroupAddon>
					</InputGroup>
				</div>
			</div>

			{/* Table body */}
			{isLoading ? (
				<div className='rounded-lg border bg-card p-2 space-y-2'>
					{[...Array(6)].map((_, i) => (
						<div key={i} className='rounded-lg border bg-card p-3'>
							<div className='flex items-center gap-3'>
								<Skeleton className='h-10 w-10 rounded-md shrink-0' />
								<div className='flex-1 space-y-2'>
									<Skeleton className='h-4 w-32' />
									<Skeleton className='h-3 w-48' />
								</div>
							</div>
						</div>
					))}
				</div>
			) : displayedSpecies.length > 0 ? (
				<div className='rounded-lg border bg-card'>
					<Virtuoso
						style={{ height: `${containerHeight}px` }}
						data={displayedSpecies}
						itemContent={(_, species) => (
							<div className='p-2 pb-0 last:pb-2'>
								<SpeciesAdminRow species={species} />
							</div>
						)}
					/>
				</div>
			) : (
				<div className='rounded-lg border border-dashed p-8 text-center'>
					<p className='text-muted-foreground text-sm'>No species found</p>
				</div>
			)}
		</div>
	)
}
