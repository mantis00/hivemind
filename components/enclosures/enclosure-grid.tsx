'use client'

import { OrgSpecies, useSpecies, useOrgEnclosureCount } from '@/lib/react-query/queries'
import { ArrowDownIcon, ArrowUpIcon, Bug, Edit, Search, XIcon } from 'lucide-react'
import { Badge } from '../ui/badge'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { useParams } from 'next/navigation'
import SpeciesRow from './species-row'
import { CreateEnclosureButton } from './create-enclosure-button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Button } from '../ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '../ui/input-group'
import { Skeleton } from '../ui/skeleton'
import { UUID } from 'crypto'
import { useIsMobile } from '@/hooks/use-mobile'
import ManageSpeciesButton from './manage-species-button'
import { ResponsiveDialogDrawer } from '../ui/dialog-to-drawer'
import { EditSpeciesOrgForm } from './edit-species-org'

export default function EnclosureGrid() {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const { data: orgSpecies, isLoading } = useSpecies(orgId as UUID)
	const { data: enclosureCount } = useOrgEnclosureCount(orgId as UUID)

	const [searchValue, setSearchValue] = useState('')
	const [searchCount, setSearchCount] = useState(0)
	const [sortUp, setSortUp] = useState(true)
	const [isSorted, setIsSorted] = useState(false)
	const [sortKey, setSortKey] = useState('')

	const [displayedSpecies, setDisplayedSpecies] = useState<OrgSpecies[]>([])
	const [itemHeight, setItemHeight] = useState<number>(114)
	const [dynamicTableHeight, setDynamicTableHeight] = useState<number>(680)
	const [openSpeciesId, setOpenSpeciesId] = useState<UUID | null>(null)
	const [detailsView, setDetailsView] = useState<'details' | 'edit'>('details')
	const openSpecies = useMemo(
		() => displayedSpecies.find((s) => s.id === openSpeciesId) ?? null,
		[displayedSpecies, openSpeciesId]
	)
	const measureRef = useRef<HTMLDivElement>(null)
	const virtuosoRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (orgSpecies) setDisplayedSpecies(orgSpecies)
	}, [orgSpecies])

	useEffect(() => {
		if (measureRef.current) {
			const height = measureRef.current.getBoundingClientRect().height
			if (height > 0) {
				setItemHeight(height)
			}
		}
	}, [displayedSpecies])

	// Handle total list height changes from Virtuoso
	const handleTotalListHeightChanged = (height: number) => {
		const maxHeight = 680
		setDynamicTableHeight(Math.min(height, maxHeight))
	}

	useEffect(() => {
		if (searchValue.trim() === '') {
			setDisplayedSpecies(orgSpecies ?? [])
			setSearchCount(0)
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

		if (sortOn === 'sort') {
			setDisplayedSpecies(orgSpecies ?? [])
			setIsSorted(false)
			setSortUp(true)
			setSortKey('')
			return
		}
		let sorted: OrgSpecies[] = []

		if (sortOn === 'common_name') {
			sorted = [...displayedSpecies].sort((a, b) => {
				const na = a.custom_common_name ?? ''
				const nb = b.custom_common_name ?? ''
				return na.localeCompare(nb)
			})
		} else if (sortOn === 'scientific_name') {
			sorted = [...displayedSpecies].sort((a, b) => {
				const na = a.species?.scientific_name ?? ''
				const nb = b.species?.scientific_name ?? ''
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
		setSortKey(sortOn)
		setIsSorted(true)
	}

	const handleSearch = async () => {
		if (!searchValue.length || searchValue.trim() === '') return
		const val = searchValue.trim().toLowerCase()

		// 1. Filter species by name match
		const nameMatches = [...(orgSpecies ?? [])].filter((spec) => {
			if (spec.custom_common_name && spec.custom_common_name.trim().toLowerCase().includes(val)) return true
			if (spec.species?.scientific_name && spec.species.scientific_name.trim().toLowerCase().includes(val)) return true
			return false
		})

		const results = [...nameMatches]
		setDisplayedSpecies(results)
		setSearchCount(results.length)
	}

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			event.preventDefault()
			handleSearch()
		}
	}

	const handleClearSearch = () => {
		setSearchValue('')
		setDisplayedSpecies(orgSpecies ?? [])
		setSearchCount(0)
	}

	// Calculate initial table height based on item count
	const initialTableHeight = useMemo(() => {
		const maxHeight = 680
		const calculatedHeight = itemHeight * displayedSpecies.length
		return Math.min(calculatedHeight, maxHeight)
	}, [itemHeight, displayedSpecies.length])

	const tableHeight = dynamicTableHeight || initialTableHeight

	return (
		<div className='bg-background full'>
			<div className='mx-auto px-4'>
				<div className={`mb-2 flex items-center ${useIsMobile() ? 'flex-col gap-1' : 'flex-row gap-3'}`}>
					<div>
						<Badge variant='secondary'>{orgSpecies?.length} species</Badge>
						<Badge variant='secondary' className='gap-1'>
							{enclosureCount ?? 0} enclosures
						</Badge>
					</div>
					<div className={`flex flex-row ${useIsMobile() ? 'mx-auto' : 'ml-auto'} gap-2`}>
						<div>
							<CreateEnclosureButton />
						</div>
						<div>
							<ManageSpeciesButton />
						</div>
					</div>
				</div>

				{/* Sort and Search */}
				<div className='w-full py-2 flex flex-row gap-3'>
					<Select onValueChange={handleSortChange} value={sortKey} disabled={isLoading}>
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
										handleSortChange('sort')
									}}
									className='flex-shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-foreground cursor-pointer'
								>
									<XIcon className='size-3.5 text-current' />
								</span>
							)}
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='common_name' className='text-l'>
								Common Name
							</SelectItem>
							<SelectItem value='scientific_name' className='text-l'>
								Scientific Name
							</SelectItem>
						</SelectContent>
					</Select>
					<Button variant='outline' size='icon' onClick={() => setSortUp(!sortUp)} disabled={isLoading || !isSorted}>
						{sortUp ? <ArrowUpIcon /> : <ArrowDownIcon />}
					</Button>
					<InputGroup className='w-40 sm:w-60 ml-auto' onKeyDown={handleKeyDown}>
						<InputGroupInput
							placeholder='Search...'
							value={searchValue}
							onChange={(e) => {
								setSearchValue(e.target.value)
							}}
						/>
						{searchValue && (
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
							{searchCount > 0 ? searchCount + ' Results' : ''}{' '}
						</InputGroupAddon>
					</InputGroup>
				</div>

				{/* Species Virtuoso Table */}
				{isLoading ? (
					<div className='rounded-lg border bg-card p-2 space-y-2'>
						{[...Array(8)].map((_, i) => (
							<div key={i} className='rounded-lg border bg-card p-4'>
								<div className='flex items-center gap-3'>
									<Skeleton className='h-4 w-4 shrink-0' />
									<Skeleton className='h-5 w-5 shrink-0' />
									<div className='flex-1 space-y-2'>
										<div className='flex items-center gap-2'>
											<Skeleton className='h-4 w-32' />
											<Skeleton className='h-5 w-16' />
										</div>
										<Skeleton className='h-3 w-48' />
									</div>
									<Skeleton className='h-4 w-4 shrink-0' />
								</div>
							</div>
						))}
					</div>
				) : displayedSpecies?.length && displayedSpecies?.length > 0 ? (
					<>
						{/* Hidden measurement element */}
						<div
							ref={measureRef}
							aria-hidden='true'
							style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}
						>
							<div className='p-2 pb-0 last:pb-2'>
								<SpeciesRow species={displayedSpecies[0]} onDetailsOpenChange={() => {}} />
							</div>
						</div>
						<div ref={virtuosoRef} className='rounded-lg border bg-card'>
							<Virtuoso
								style={{ height: `${tableHeight}px`, transition: 'height 0.2s ease-in-out' }}
								data={displayedSpecies}
								computeItemKey={(_, sp) => sp.id}
								increaseViewportBy={200}
								totalListHeightChanged={handleTotalListHeightChanged}
								itemContent={(index, sp) => (
									<div className='p-2 pb-0 last:pb-2'>
										<SpeciesRow
											species={sp}
											onDetailsOpenChange={() => {
												setDetailsView('details')
												setOpenSpeciesId(sp.id)
											}}
										/>
									</div>
								)}
							/>
						</div>
					</>
				) : (
					<div className='rounded-lg border border-dashed p-8 text-center'>
						<p className='text-muted-foreground text-sm'>No species found matching &ldquo;{searchValue}&rdquo;</p>
					</div>
				)}
			</div>

			{openSpecies && (
				<ResponsiveDialogDrawer
					title={detailsView === 'edit' ? `Edit: ${openSpecies.custom_common_name}` : openSpecies.custom_common_name}
					description={
						detailsView === 'edit'
							? 'Scientific name and picture cannot be changed'
							: openSpecies.species.scientific_name
					}
					open={openSpeciesId !== null}
					onOpenChange={(open) => {
						if (!open) {
							setOpenSpeciesId(null)
							setDetailsView('details')
						}
					}}
					trigger={<span className='hidden' />}
				>
					{detailsView === 'edit' ? (
						<EditSpeciesOrgForm
							species={openSpecies}
							onDone={() => setDetailsView('details')}
							onDeleted={() => {
								setOpenSpeciesId(null)
								setDetailsView('details')
							}}
						/>
					) : (
						<div className='flex flex-col gap-4'>
							<Button variant='ghost' onClick={() => setDetailsView('edit')}>
								<Edit className='h-4 w-4 mr-2' /> Edit
							</Button>
							{openSpecies.species.picture_url ? (
								<img
									src={openSpecies.species.picture_url}
									alt={openSpecies.custom_common_name}
									className='rounded-md max-h-48 w-full object-contain mx-auto'
								/>
							) : (
								<div className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
									No image available
								</div>
							)}
							<div className='rounded-md bg-muted p-3'>
								<p className='text-xs font-medium text-muted-foreground mb-1'>Care Instructions</p>
								<p className='text-sm leading-relaxed'>{openSpecies.custom_care_instructions}</p>
							</div>
						</div>
					)}
				</ResponsiveDialogDrawer>
			)}
		</div>
	)
}
