'use client'

import { Species, useOrgSpecies } from '@/lib/react-query/queries'
import { ArrowDownIcon, ArrowUpIcon, Search, Warehouse } from 'lucide-react'
import { Badge } from '../ui/badge'
import { useEffect, useState } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { useParams } from 'next/navigation'
import SpeciesRow from './species-row'
import { CreateEnclosureButton } from './create-enclosure-button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Button } from '../ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '../ui/input-group'

export default function EnclosureGrid() {
	const params = useParams()
	const orgId = params?.orgId as number | undefined
	const { data: orgSpecies } = useOrgSpecies(orgId as number)
	console.log(orgSpecies)

	const [isLoading, setIsLoading] = useState(false)

	const [searchValue, setSearchValue] = useState('')
	const [searchCount, setSearchCount] = useState(0)
	const [sortUp, setSortUp] = useState(true)
	const [isSorted, setIsSorted] = useState(false)

	const [displayedSpecies, setDisplayedSpecies] = useState<Species[]>([])

	useEffect(() => {
		if (orgSpecies) setDisplayedSpecies(orgSpecies)
	}, [orgSpecies])

	useEffect(() => {
		if (searchValue.trim() === '') {
			setDisplayedSpecies(orgSpecies ?? [])
			setSearchCount(0)
			setIsLoading(false)
		}
	}, [searchValue, orgSpecies])

	useEffect(() => {
		if (displayedSpecies?.length > 0) {
			const temp = [...(displayedSpecies ?? [])].toReversed()
			setDisplayedSpecies(temp)
		}
	}, [sortUp])

	const handleSortChange = (sortOn: string) => {
		if (!displayedSpecies?.length) return
		setIsLoading(true)

		if (sortOn === 'sort') {
			setDisplayedSpecies(orgSpecies ?? [])
			setIsSorted(false)
			setSortUp(true)
			setIsLoading(false)
			return
		}
		let sorted: Species[] = []

		if (sortOn === 'common_name') {
			sorted = [...displayedSpecies].sort((a, b) => {
				const na = a.common_name ?? ''
				const nb = b.common_name ?? ''
				return na.localeCompare(nb)
			})
		} else if (sortOn === 'scientific_name') {
			sorted = [...displayedSpecies].sort((a, b) => {
				const na = a.scientific_name ?? ''
				const nb = b.scientific_name ?? ''
				return na.localeCompare(nb)
			})
		}
		// else if (sortOn === 'enclosure_count') {
		//   sorted = [...displayedSpecies].sort((a, b) => {
		//     const na = a.species?.common_name ?? ''
		//     const nb = b.species?.common_name ?? ''
		//     return na.localeCompare(nb)
		//   })
		// }

		if (sorted.length > 0) {
			setDisplayedSpecies(sorted)
		}
		setIsSorted(true)
		setIsLoading(false)
	}

	const handleSearch = () => {
		if (!searchValue.length || searchValue.trim() === '') return
		setIsLoading(true)
		let results: Species[] = []
		const val = searchValue.trim().toLowerCase()

		results = [...(orgSpecies ?? [])].filter((spec) => {
			if (spec.common_name && spec.common_name.trim().toLowerCase().includes(val)) return true
			if (spec.scientific_name && spec.scientific_name.trim().toLowerCase().includes(val)) return true
			if (spec.scientific_name && spec.scientific_name.trim().toLowerCase().includes(val)) return true
		})
		setDisplayedSpecies(results)
		setSearchCount(results.length)
		setIsLoading(false)
	}

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			event.preventDefault()
			handleSearch()
		}
	}

	return (
		<div className='bg-background full'>
			<div className='mx-auto max-w-3xl px-4 py-8'>
				{/* Header */}
				<div className='mb-2'>
					<div className='flex items-center gap-3 mb-2'>
						<Warehouse className='h-7 w-7 text-foreground' />
						<h1 className='text-2xl font-bold tracking-tight text-balance'>Enclosures</h1>
						<div className='ml-auto'>
							<CreateEnclosureButton />
						</div>
					</div>
					<p className='text-sm text-muted-foreground'>
						Browse species and manage their enclosures, tanks, and vivariums.
					</p>
					<div className='flex items-center gap-3 mt-3'>
						<Badge variant='secondary'>{orgSpecies?.length} species</Badge>
						{/* <Badge variant="outline">{totalEnclosures} enclosures</Badge> */}
					</div>
				</div>

				{/* Sort and Search */}
				<div className='w-full py-2 flex flex-row gap-3'>
					<Select onValueChange={handleSortChange} defaultValue='sort' disabled={isLoading}>
						<SelectTrigger className='w-40'>
							<SelectValue placeholder='Sort' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='sort' className='text-l'>
								Sort
							</SelectItem>
							<SelectItem value='common_name' className='text-l'>
								Common Name
							</SelectItem>
							<SelectItem value='scientific_name' className='text-l'>
								Scientific Name
							</SelectItem>
							<SelectItem value='population' className='text-l'>
								# of Enclosures
							</SelectItem>
						</SelectContent>
					</Select>
					<Button variant='outline' size='icon' onClick={() => setSortUp(!sortUp)} disabled={isLoading || !isSorted}>
						{sortUp ? <ArrowUpIcon /> : <ArrowDownIcon />}
					</Button>
					<InputGroup className='w-40 sm:w-60 mx-auto sm:ml-auto sm:mr-0' onKeyDown={handleKeyDown}>
						<InputGroupInput
							placeholder='Search...'
							value={searchValue}
							onChange={(e) => {
								setSearchValue(e.target.value)
							}}
						/>
						<InputGroupAddon>
							<InputGroupButton onClick={handleSearch} disabled={isLoading}>
								<Search />
							</InputGroupButton>
						</InputGroupAddon>
						<InputGroupAddon className='hidden sm:block' align='inline-end'>
							{searchCount > 0 ? searchCount + ' Results' : ''}{' '}
						</InputGroupAddon>
					</InputGroup>
				</div>

				{/* Species Virtuoso Table */}
				{displayedSpecies?.length && displayedSpecies?.length > 0 ? (
					<div className='rounded-lg border bg-card'>
						<Virtuoso
							style={{ height: '680px' }}
							data={displayedSpecies}
							itemContent={(index, sp) => (
								<div className='p-2 pb-0 last:pb-2'>
									<SpeciesRow species={sp} />
								</div>
							)}
						/>
					</div>
				) : (
					<div className='rounded-lg border border-dashed p-8 text-center'>
						<p className='text-muted-foreground text-sm'>No species found matching &ldquo;{searchValue}&rdquo;</p>
					</div>
				)}
			</div>
		</div>
	)
}
