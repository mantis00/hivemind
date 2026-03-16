'use client'

import { OrgSpecies, useOrgSpecies } from '@/lib/react-query/queries'
import {
	ArrowDownIcon,
	ArrowUpIcon,
	Edit,
	ListChecks,
	LoaderCircle,
	Menu,
	Move,
	PlusIcon,
	Search,
	TrashIcon,
	XIcon
} from 'lucide-react'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { EditSpeciesOrgForm } from './edit-species-org'
import { EnclosureCounts } from './enclosure-counts'
import { useBatchDeleteEnclosures } from '@/lib/react-query/mutations'

export default function EnclosureGrid() {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const { data: orgSpecies, isLoading } = useOrgSpecies(orgId as UUID)

	const [searchValue, setSearchValue] = useState('')
	const [searchCount, setSearchCount] = useState(0)
	const [sortUp, setSortUp] = useState(true)
	const [isSorted, setIsSorted] = useState(false)
	const [sortKey, setSortKey] = useState('')

	const [displayedSpecies, setDisplayedSpecies] = useState<OrgSpecies[]>(orgSpecies ?? [])
	const [prevOrgSpecies, setPrevOrgSpecies] = useState(orgSpecies)
	const [itemHeight, setItemHeight] = useState<number>(114)
	const [dynamicTableHeight, setDynamicTableHeight] = useState<number>(680)
	const [openSpeciesId, setOpenSpeciesId] = useState<UUID | null>(null)
	const [detailsView, setDetailsView] = useState<'details' | 'edit'>('details')

	const [selectMode, setSelectMode] = useState(false)
	const [selectedIds, setSelectedIds] = useState<Set<UUID>>(new Set())
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
	const [manageOpen, setManageOpen] = useState(false)
	const [createOpen, setCreateOpen] = useState(false)
	const batchDeleteMutation = useBatchDeleteEnclosures()
	const isMobile = useIsMobile()

	const handleSelectChange = (enclosureId: UUID, checked: boolean) => {
		setSelectedIds((prev) => {
			const next = new Set(prev)
			if (checked) next.add(enclosureId)
			else next.delete(enclosureId)
			return next
		})
	}

	const toggleSelectMode = () => {
		setSelectMode((prev) => !prev)
		if (selectMode) setSelectedIds(new Set())
	}

	const executeDelete = () => {
		batchDeleteMutation.mutate(
			{ ids: Array.from(selectedIds), orgId: orgId as UUID },
			{
				onSuccess: () => {
					setSelectedIds(new Set())
					setSelectMode(false)
					setDeleteConfirmOpen(false)
				}
			}
		)
	}
	const openSpecies = useMemo(
		() => displayedSpecies.find((s) => s.id === openSpeciesId) ?? null,
		[displayedSpecies, openSpeciesId]
	)
	const measureRef = useRef<HTMLDivElement>(null)
	const virtuosoRef = useRef<HTMLDivElement>(null)

	// Sync displayedSpecies when the query data changes ("setState during render" pattern)
	if (prevOrgSpecies !== orgSpecies) {
		setPrevOrgSpecies(orgSpecies)
		if (searchValue.trim() === '') {
			setDisplayedSpecies(orgSpecies ?? [])
			setSearchCount(0)
		}
	}

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

	const handleSearchChange = (val: string) => {
		setSearchValue(val)
		if (!val.trim()) {
			setDisplayedSpecies(orgSpecies ?? [])
			setSearchCount(0)
			return
		}
		const lower = val.trim().toLowerCase()
		const scoreMatch = (str: string | undefined): number => {
			if (!str) return -1
			const s = str.trim().toLowerCase()
			if (s === lower) return 0
			if (s.startsWith(lower)) return 1
			if (s.includes(lower)) return 2
			return -1
		}
		const scored = (orgSpecies ?? []).map((spec) => {
			let score = -1
			if (sortKey === 'common_name') {
				score = scoreMatch(spec.custom_common_name)
			} else if (sortKey === 'scientific_name') {
				score = scoreMatch(spec.species?.scientific_name)
			} else {
				const scores = [scoreMatch(spec.custom_common_name), scoreMatch(spec.species?.scientific_name)].filter(
					(s) => s >= 0
				)
				score = scores.length > 0 ? Math.min(...scores) : -1
			}
			return { spec, score }
		})
		const results = scored
			.filter(({ score }) => score >= 0)
			.sort((a, b) => a.score - b.score)
			.map(({ spec }) => spec)
		setDisplayedSpecies(results)
		setSearchCount(results.length)
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
		<>
			<div className='mx-auto items-center w-full'>
				{!isMobile && <EnclosureCounts />}
				<div className='mb-2 flex items-center flex-row gap-2 justify-end'>
					{selectMode && (
						<div className='flex items-center gap-2 mr-auto'>
							<Button variant='ghost' size='sm' className='gap-1.5 text-xs' onClick={toggleSelectMode}>
								<XIcon className='h-3.5 w-3.5' />
								Cancel
							</Button>
							{selectedIds.size > 0 && (
								<>
									<span className='text-xs text-muted-foreground'>{selectedIds.size} selected</span>
									<Button
										size='sm'
										variant='destructive'
										className='gap-1.5 text-xs'
										onClick={() => setDeleteConfirmOpen(true)}
										disabled={batchDeleteMutation.isPending}
									>
										<TrashIcon className='h-3.5 w-3.5' />
										Delete
									</Button>
								</>
							)}
						</div>
					)}
					{isMobile ? (
						<>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant='outline' size='sm'>
										<Menu className='h-4 w-4' />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align='end'>
									<DropdownMenuItem onSelect={() => setManageOpen(true)}>
										<Move className='h-4 w-4' />
										Manage Species
									</DropdownMenuItem>
									<DropdownMenuItem onSelect={() => setCreateOpen(true)}>
										<PlusIcon className='h-4 w-4' />
										Add Enclosure
									</DropdownMenuItem>
									<DropdownMenuItem onSelect={toggleSelectMode}>
										<ListChecks className='h-4 w-4' />
										Select
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
							<ManageSpeciesButton open={manageOpen} onOpenChange={setManageOpen} />
							<CreateEnclosureButton open={createOpen} onOpenChange={setCreateOpen} />
						</>
					) : (
						<>
							<Button variant='outline' size='sm' onClick={toggleSelectMode} className='gap-1.5'>
								<ListChecks className='h-4 w-4' />
								Select
							</Button>
							<ManageSpeciesButton />
							<CreateEnclosureButton />
						</>
					)}
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
									className='shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-foreground cursor-pointer'
								>
									<XIcon className='size-3.5 text-current' />
								</span>
							)}
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='common_name' className='text-l cursor-pointer'>
								Common Name
							</SelectItem>
							<SelectItem value='scientific_name' className='text-l cursor-pointer'>
								Scientific Name
							</SelectItem>
						</SelectContent>
					</Select>
					<Button
						variant='outline'
						size='icon'
						onClick={() => {
							const newSortUp = !sortUp
							setSortUp(newSortUp)
							if (displayedSpecies?.length > 0) {
								setDisplayedSpecies([...displayedSpecies].toReversed())
							}
						}}
						disabled={isLoading || !isSorted}
					>
						{sortUp ? <ArrowUpIcon /> : <ArrowDownIcon />}
					</Button>
					<InputGroup className='w-40 sm:w-60 ml-auto'>
						<InputGroupAddon>
							<Search className='h-4 w-4 text-muted-foreground' />
						</InputGroupAddon>
						<InputGroupInput
							placeholder='Search...'
							value={searchValue}
							onChange={(e) => handleSearchChange(e.target.value)}
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
						{searchCount > 0 && (
							<InputGroupAddon align='inline-end' className='hidden sm:block pr-2 text-xs text-muted-foreground'>
								{searchCount} Results
							</InputGroupAddon>
						)}
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
								<SpeciesRow
									species={displayedSpecies[0]}
									onDetailsOpenChange={() => {}}
									sortKey={sortKey}
									selectMode={selectMode}
									selectedIds={selectedIds}
									onSelectChange={handleSelectChange}
								/>
							</div>
						</div>
						<div ref={virtuosoRef} className='rounded-lg border bg-card'>
							<Virtuoso
								className='scrollbar-no-track'
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
											sortKey={sortKey}
											selectMode={selectMode}
											selectedIds={selectedIds}
											onSelectChange={handleSelectChange}
										/>
									</div>
								)}
							/>
						</div>
					</>
				) : (
					<div className='rounded-lg border border-dashed p-8 text-center'>
						{searchValue.trim() ? (
							<p className='text-muted-foreground text-sm'>No species found matching &ldquo;{searchValue}&rdquo;</p>
						) : (
							<>
								<p className='text-muted-foreground text-sm font-medium'>No species yet</p>
								<p className='text-muted-foreground text-xs mt-1'>
									Add species to your organization using the Manage Species button above.
								</p>
							</>
						)}
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
								<Image
									src={openSpecies.species.picture_url}
									alt={openSpecies.custom_common_name ?? ''}
									width={600}
									height={192}
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

			<ResponsiveDialogDrawer
				title='Delete Enclosures'
				description={`Are you sure you want to delete ${selectedIds.size} enclosure${selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.`}
				trigger={null}
				open={deleteConfirmOpen}
				onOpenChange={setDeleteConfirmOpen}
			>
				<div className='flex flex-col gap-3 px-4 pb-4'>
					<Button variant='destructive' disabled={batchDeleteMutation.isPending} onClick={executeDelete}>
						{batchDeleteMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Confirm Delete'}
					</Button>
					<Button
						variant='outline'
						onClick={() => setDeleteConfirmOpen(false)}
						disabled={batchDeleteMutation.isPending}
					>
						Cancel
					</Button>
				</div>
			</ResponsiveDialogDrawer>
		</>
	)
}
