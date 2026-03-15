'use client'

import { useOrgEnclosures, useOrgSpecies } from '@/lib/react-query/queries'
import {
	ArrowDownIcon,
	ArrowUpIcon,
	Edit,
	ListChecks,
	LoaderCircle,
	Menu,
	Move,
	Power,
	PowerOff,
	PlusIcon,
	Search,
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '../ui/dropdown-menu'
import { EditSpeciesOrgForm } from './edit-species-org'
import { EnclosureCounts } from './enclosure-counts'
import { useBatchActivateEnclosures, useBatchDeleteEnclosures } from '@/lib/react-query/mutations'

export default function EnclosureGrid() {
	type EnclosureStatusFilter = 'active' | 'inactive' | 'all'

	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const { data: orgSpecies, isLoading } = useOrgSpecies(orgId as UUID)
	const activeOrgSpecies = useMemo(() => (orgSpecies ?? []).filter((s) => s.is_active), [orgSpecies])

	const [searchValue, setSearchValue] = useState('')
	const [appliedSearch, setAppliedSearch] = useState('')
	const [sortUp, setSortUp] = useState(true)
	const [isSorted, setIsSorted] = useState(false)
	const [sortKey, setSortKey] = useState('')
	const [enclosureStatusFilter, setEnclosureStatusFilter] = useState<EnclosureStatusFilter>('active')
	const { data: filteredEnclosures } = useOrgEnclosures(orgId as UUID, enclosureStatusFilter)
	const filteredSpeciesSource = useMemo(() => {
		const speciesIds = new Set((filteredEnclosures ?? []).map((enc) => enc.species_id))
		return activeOrgSpecies.filter((s) => speciesIds.has(s.id))
	}, [activeOrgSpecies, filteredEnclosures])

	const displayedSpecies = useMemo(() => {
		const scoreMatch = (str: string | undefined, val: string): number => {
			if (!str) return -1
			const s = str.trim().toLowerCase()
			if (s === val) return 0
			if (s.startsWith(val)) return 1
			if (s.includes(val)) return 2
			return -1
		}

		let list = filteredSpeciesSource

		if (appliedSearch) {
			const scored = list.map((spec) => {
				let score = -1
				if (sortKey === 'common_name') {
					score = scoreMatch(spec.custom_common_name, appliedSearch)
				} else if (sortKey === 'scientific_name') {
					score = scoreMatch(spec.species?.scientific_name, appliedSearch)
				} else {
					const scores = [
						scoreMatch(spec.custom_common_name, appliedSearch),
						scoreMatch(spec.species?.scientific_name, appliedSearch)
					].filter((s) => s >= 0)
					score = scores.length > 0 ? Math.min(...scores) : -1
				}
				return { spec, score }
			})

			list = scored
				.filter(({ score }) => score >= 0)
				.sort((a, b) => a.score - b.score)
				.map(({ spec }) => spec)
		}

		if (isSorted) {
			if (sortKey === 'common_name') {
				list = [...list].sort((a, b) => (a.custom_common_name ?? '').localeCompare(b.custom_common_name ?? ''))
			} else if (sortKey === 'scientific_name') {
				list = [...list].sort((a, b) =>
					(a.species?.scientific_name ?? '').localeCompare(b.species?.scientific_name ?? '')
				)
			}

			if (!sortUp) {
				list = [...list].toReversed()
			}
		}

		return list
	}, [filteredSpeciesSource, appliedSearch, sortKey, isSorted, sortUp])
	const searchCount = appliedSearch ? displayedSpecies.length : 0
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
	const batchActivateMutation = useBatchActivateEnclosures()
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

	const handleFilterChange = (filter: EnclosureStatusFilter) => {
		setEnclosureStatusFilter(filter)
		setSelectedIds(new Set())
	}

	const executeSetInactive = () => {
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

	const executeActivate = () => {
		batchActivateMutation.mutate(
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
			setIsSorted(false)
			setSortUp(true)
			setSortKey('')
			return
		}
		setSortKey(sortOn)
		setIsSorted(true)
	}

	const handleSearch = async () => {
		const val = searchValue.trim().toLowerCase()
		setAppliedSearch(val)
	}

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			event.preventDefault()
			handleSearch()
		}
	}

	const handleClearSearch = () => {
		setSearchValue('')
		setAppliedSearch('')
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
									{enclosureStatusFilter === 'inactive' ? (
										<Button
											size='sm'
											variant='outline'
											className='gap-1.5 text-xs'
											onClick={() => setDeleteConfirmOpen(true)}
											disabled={batchActivateMutation.isPending}
										>
											<Power className='h-3.5 w-3.5' />
											Set Active
										</Button>
									) : (
										<Button
											size='sm'
											variant='outline'
											className='gap-1.5 text-xs'
											onClick={() => setDeleteConfirmOpen(true)}
											disabled={batchDeleteMutation.isPending}
										>
											<PowerOff className='h-3.5 w-3.5' />
											Set Inactive
										</Button>
									)}
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
									<DropdownMenuLabel className='text-muted-foreground'>Enclosure View</DropdownMenuLabel>
									<DropdownMenuItem onSelect={() => setCreateOpen(true)}>
										<PlusIcon className='h-4 w-4' />
										Add Enclosure
									</DropdownMenuItem>
									<DropdownMenuItem onSelect={() => setManageOpen(true)}>
										<Move className='h-4 w-4' />
										Manage Species
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuLabel className='text-muted-foreground'>Status Filter</DropdownMenuLabel>
									<DropdownMenuItem onSelect={() => handleFilterChange('active')}>
										Show Active Enclosures
									</DropdownMenuItem>
									<DropdownMenuItem onSelect={() => handleFilterChange('inactive')}>
										Show Inactive Enclosures
									</DropdownMenuItem>
									<DropdownMenuItem onSelect={() => handleFilterChange('all')}>Show All Enclosures</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuLabel className='text-muted-foreground'>Selection</DropdownMenuLabel>
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
							<Button
								variant='outline'
								size='sm'
								onClick={toggleSelectMode}
								className='gap-1.5'
								disabled={enclosureStatusFilter === 'all'}
							>
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
					{!isMobile && (
						<Select
							onValueChange={(value) => handleFilterChange(value as EnclosureStatusFilter)}
							value={enclosureStatusFilter}
							disabled={isLoading}
						>
							<SelectTrigger className='w-46'>
								<SelectValue placeholder='Enclosures' className='flex-1 min-w-0 truncate' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='active' className='text-l cursor-pointer'>
									Active Enclosures
								</SelectItem>
								<SelectItem value='inactive' className='text-l cursor-pointer'>
									Inactive Enclosures
								</SelectItem>
								<SelectItem value='all' className='text-l cursor-pointer'>
									All Enclosures
								</SelectItem>
							</SelectContent>
						</Select>
					)}
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
						}}
						disabled={isLoading || !isSorted}
					>
						{sortUp ? <ArrowUpIcon /> : <ArrowDownIcon />}
					</Button>
					<InputGroup className='w-40 sm:w-60 ml-auto' onKeyDown={handleKeyDown}>
						<InputGroupInput
							placeholder='Search...'
							value={searchValue}
							onChange={(e) => {
								const val = e.target.value
								setSearchValue(val)
								if (val.trim() === '') {
									setAppliedSearch('')
								}
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
								<SpeciesRow
									species={displayedSpecies[0]}
									onDetailsOpenChange={() => {}}
									sortKey={sortKey}
									enclosureStatusFilter={enclosureStatusFilter}
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
											enclosureStatusFilter={enclosureStatusFilter}
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
				title={enclosureStatusFilter === 'inactive' ? 'Activate Enclosures' : 'Set Enclosures Inactive'}
				description={
					enclosureStatusFilter === 'inactive'
						? `Set ${selectedIds.size} enclosure${selectedIds.size !== 1 ? 's' : ''} to active?`
						: `Set ${selectedIds.size} enclosure${selectedIds.size !== 1 ? 's' : ''} to inactive? They will be hidden from active views but their data will be preserved.`
				}
				trigger={null}
				open={deleteConfirmOpen}
				onOpenChange={setDeleteConfirmOpen}
			>
				<div className='flex flex-col gap-3 px-4 pb-4'>
					{enclosureStatusFilter === 'inactive' ? (
						<Button disabled={batchActivateMutation.isPending} onClick={executeActivate}>
							{batchActivateMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Set Active'}
						</Button>
					) : (
						<Button disabled={batchDeleteMutation.isPending} onClick={executeSetInactive}>
							{batchDeleteMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Set Inactive'}
						</Button>
					)}
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
