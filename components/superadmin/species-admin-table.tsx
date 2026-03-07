'use client'

import { useState, useMemo } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { useAllSpecies } from '@/lib/react-query/queries'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowDownIcon, ArrowUpIcon, Search, XIcon } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { SpeciesAdminRow } from './species-admin-row'
import { CreateSpeciesButton } from './create-species-button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

const MAX_HEIGHT = 600
const ROW_HEIGHT = 74

export function SpeciesAdminTable() {
	const { data: allSpecies, isLoading } = useAllSpecies()
	const [search, setSearch] = useState('')
	const [activeSearch, setActiveSearch] = useState('')
	const [sortKey, setSortKey] = useState<string>('')
	const [sortUp, setSortUp] = useState(true)

	const isSorted = sortKey !== ''

	const displayedSpecies = useMemo(() => {
		let list = allSpecies ?? []
		if (activeSearch.trim()) {
			const val = activeSearch.trim().toLowerCase()
			list = list.filter(
				(s) => s.common_name?.toLowerCase().includes(val) || s.scientific_name?.toLowerCase().includes(val)
			)
		}
		if (sortKey) {
			list = [...list].sort((a, b) => {
				const na = (sortKey === 'common_name' ? a.common_name : a.scientific_name) ?? ''
				const nb = (sortKey === 'common_name' ? b.common_name : b.scientific_name) ?? ''
				return na.localeCompare(nb)
			})
			if (!sortUp) list = list.toReversed()
		}
		return list
	}, [allSpecies, activeSearch, sortKey, sortUp])

	const searchCount = activeSearch ? displayedSpecies.length : 0

	const handleSortChange = (value: string) => {
		if (value === 'reset') {
			setSortKey('')
			setSortUp(true)
			return
		}
		setSortKey(value)
	}

	const handleToggleDirection = () => {
		setSortUp((prev) => !prev)
	}

	const handleSearch = () => {
		setActiveSearch(search)
	}

	const handleSearchChange = (val: string) => {
		setSearch(val)
		if (val.trim() === '') setActiveSearch('')
	}

	const handleClearSearch = () => {
		setSearch('')
		setActiveSearch('')
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			handleSearch()
		}
	}

	const [listHeight, setListHeight] = useState(ROW_HEIGHT)
	const containerHeight = Math.min(listHeight, MAX_HEIGHT)

	return (
		<div className='space-y-3'>
			{/* Row 1: badge + create button */}
			<div className='mb-2 flex items-center gap-3'>
				<Badge variant='secondary'>{allSpecies?.length ?? 0} species</Badge>
				<div className='ml-auto'>
					<CreateSpeciesButton />
				</div>
			</div>

			{/* Row 2: sort + search */}
			<div className='w-full py-2 flex flex-row gap-3'>
				<Select onValueChange={handleSortChange} value={sortKey || ''} disabled={isLoading}>
					<SelectTrigger className='w-45'>
						<SelectValue placeholder='Sort' className='flex-1 min-w-0 truncate' />
						{isSorted && (
							<span
								role='button'
								tabIndex={-1}
								onPointerDown={(e) => {
									e.stopPropagation()
									e.preventDefault()
								}}
								onClick={(e) => {
									e.stopPropagation()
									handleSortChange('reset')
								}}
								className='shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-foreground cursor-pointer'
							>
								<XIcon className='size-3.5 text-current' />
							</span>
						)}
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='common_name'>Common Name</SelectItem>
						<SelectItem value='scientific_name'>Scientific Name</SelectItem>
					</SelectContent>
				</Select>
				<Button variant='outline' size='icon' onClick={handleToggleDirection} disabled={isLoading || !isSorted}>
					{sortUp ? <ArrowUpIcon /> : <ArrowDownIcon />}
				</Button>
				<InputGroup className='w-40 sm:w-60 ml-auto' onKeyDown={handleKeyDown}>
					<InputGroupInput placeholder='Search…' value={search} onChange={(e) => handleSearchChange(e.target.value)} />
					{search && (
						<InputGroupAddon align='inline-end' className='pr-1'>
							<InputGroupButton
								onClick={handleClearSearch}
								className='h-6 w-6 text-muted-foreground hover:text-foreground'
							>
								<XIcon className='h-3 w-3' />
							</InputGroupButton>
						</InputGroupAddon>
					)}
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
						totalListHeightChanged={setListHeight}
						itemContent={(_, species) => (
							<div className='p-2 pb-0 last:pb-2'>
								<SpeciesAdminRow key={species.id} species={species} />
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
