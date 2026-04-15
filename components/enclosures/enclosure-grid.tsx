'use client'

import {
	type OrgSpecies,
	useOrgEnclosures,
	useOrgSpecies,
	useSpeciesCareInstructions,
	useOrgSpeciesCareInstructions
} from '@/lib/react-query/queries'
import type { Enclosure } from '@/lib/react-query/queries'
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
	XIcon,
	Download
} from 'lucide-react'

import { useCallback, useMemo, useState } from 'react'
import Image from 'next/image'
import { Virtuoso } from 'react-virtuoso'
import { useParams } from 'next/navigation'
import SpeciesRow from './species-row'
import type { EnclosureExportData } from './species-row'
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
import { CareInstructionDocs } from './care-instruction-docs'
import { EnclosureCounts } from './enclosure-counts'
import { useBatchActivateEnclosures, useBatchDeleteEnclosures } from '@/lib/react-query/mutations'
import { toast } from 'sonner'

export default function EnclosureGrid() {
	type EnclosureStatusFilter = 'active' | 'inactive' | 'all'

	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const { data: orgSpecies, isLoading } = useOrgSpecies(orgId as UUID)
	const orgSpeciesById = useMemo(() => new Map((orgSpecies ?? []).map((s) => [s.id, s])), [orgSpecies])
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
	const TARGET_ROWS = 8
	const [openSpeciesId, setOpenSpeciesId] = useState<UUID | null>(null)
	const [detailsView, setDetailsView] = useState<'details' | 'edit'>('details')

	const openSpeciesMasterSpeciesId = openSpeciesId
		? (orgSpeciesById.get(openSpeciesId)?.master_species_id ?? null)
		: null
	const { data: defaultDocs } = useSpeciesCareInstructions(openSpeciesMasterSpeciesId as UUID)
	const { data: orgDocs } = useOrgSpeciesCareInstructions(openSpeciesId as UUID)
	const visibleDefaultDocs = (defaultDocs ?? []).filter((d) => !d.is_hidden_by_org)

	const [selectMode, setSelectMode] = useState(false)
	const [selectedIds, setSelectedIds] = useState<Set<UUID>>(new Set())
	const [selectedEnclosureData, setSelectedEnclosureData] = useState<Map<UUID, EnclosureExportData>>(new Map())
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
	const [manageOpen, setManageOpen] = useState(false)
	const [createOpen, setCreateOpen] = useState(false)
	const batchDeleteMutation = useBatchDeleteEnclosures()
	const { data: orgEnclosures } = useOrgEnclosures(orgId as UUID)
	const batchActivateMutation = useBatchActivateEnclosures()
	const isMobile = useIsMobile()

	const handleSelectChange = useCallback((enclosureId: UUID, checked: boolean, data?: EnclosureExportData) => {
		setSelectedIds((prev) => {
			const next = new Set(prev)
			if (checked) next.add(enclosureId)
			else next.delete(enclosureId)
			return next
		})
		setSelectedEnclosureData((prev) => {
			const next = new Map(prev)
			if (checked && data) next.set(enclosureId, data)
			else next.delete(enclosureId)
			return next
		})
	}, [])

	const handleSelectAll = useCallback(
		(enclosures: Enclosure[], select: boolean, species: OrgSpecies) => {
			setSelectedIds((prev) => {
				const next = new Set(prev)
				for (const enc of enclosures) {
					if (select) next.add(enc.id)
					else next.delete(enc.id)
				}
				return next
			})
			setSelectedEnclosureData((prev) => {
				const next = new Map(prev)
				for (const enc of enclosures) {
					if (select) {
						if (enclosureStatusFilter === 'all' && !enc.is_active) {
							toast.warning('Inactive enclosures cannot be printed. They can be selected for status updates only.')
						}
						next.set(enc.id, {
							enclosureName: enc.name,
							commonName: species.custom_common_name,
							scientificName: species?.species.scientific_name ?? '',
							populationCount: enc.current_count,
							isActive: enc.is_active
						})
					} else {
						next.delete(enc.id)
					}
				}
				return next
			})
		},
		[enclosureStatusFilter]
	)

	const getExportHeaders = () => {
		return ['Enclosure Name', 'Common Name', 'Scientific Name', 'Population Count', 'URL']
	}

	const buildExportRow = (data: EnclosureExportData, url: string) => {
		return [data.enclosureName, data.commonName, data.scientificName, String(data.populationCount ?? ''), url]
	}

	const toggleSelectMode = () => {
		setSelectMode((prev) => !prev)
		if (selectMode) {
			setSelectedIds(new Set())
			setSelectedEnclosureData(new Map())
		}
	}

	const buildAndDownloadCsv = (headers: string[], rows: string[][], filename: string) => {
		const csvContent = [headers, ...rows]
			.map((row) => row.map((cell) => `"${(cell ?? '').replace(/"/g, '""')}"`).join(','))
			.join('\n')
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = filename
		a.click()
		URL.revokeObjectURL(url)
	}

	const exportToCsv = () => {
		const printableIds = Array.from(selectedIds).filter((id) => {
			const d = selectedEnclosureData.get(id)
			return d ? d.isActive : true
		})

		if (printableIds.length !== selectedIds.size) {
			toast.warning('Inactive enclosures were excluded from export.')
		}

		if (!printableIds.length) {
			toast.info('No active enclosures selected to export.')
			return
		}

		const baseUrl = window.location.origin
		const headers = getExportHeaders()
		const rows = printableIds.map((id) => {
			const d = selectedEnclosureData.get(id)
			if (!d) return headers.map(() => '')
			return buildExportRow(d, `${baseUrl}/protected/orgs/${orgId}/enclosures/${id}`)
		})
		buildAndDownloadCsv(headers, rows, 'enclosures.csv')
	}

	const exportAll = () => {
		const active = (orgEnclosures ?? []).filter((e) => e.is_active)
		if (!active.length) {
			toast.info('No active enclosures to export.')
			return
		}
		const baseUrl = window.location.origin
		const headers = getExportHeaders()
		const rows = active.map((enc) => {
			const sp = orgSpeciesById.get(enc.species_id)
			return buildExportRow(
				{
					enclosureName: enc.name,
					commonName: sp?.custom_common_name ?? '',
					scientificName: sp?.species.scientific_name ?? '',
					populationCount: enc.current_count,
					isActive: enc.is_active
				},
				`${baseUrl}/protected/orgs/${orgId}/enclosures/${enc.id}`
			)
		})
		buildAndDownloadCsv(headers, rows, 'enclosures.csv')
	}

	const handleFilterChange = (filter: EnclosureStatusFilter) => {
		setEnclosureStatusFilter(filter)
		setSelectMode(false)
		setSelectedIds(new Set())
		setSelectedEnclosureData(new Map())
		setDeleteConfirmOpen(false)
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

	const handleClearSearch = () => {
		setSearchValue('')
		setAppliedSearch('')
	}

	return (
		<>
			<div className='mx-auto items-center w-full'>
				{!isMobile && <EnclosureCounts />}
				<div className='mb-2 flex items-center flex-row gap-2 justify-end pt-2'>
					{selectMode && (
						<div className='flex items-center gap-2 mr-auto'>
							{selectedIds.size === 0 ? (
								<Button
									size='sm'
									variant='outline'
									className='gap-1.5 text-xs'
									onClick={exportAll}
									disabled={enclosureStatusFilter === 'inactive'}
								>
									<Download className='h-3.5 w-3.5' />
									Export All
								</Button>
							) : (
								<>
									<Button
										size='sm'
										variant='outline'
										className='gap-1.5 text-xs'
										onClick={exportToCsv}
										disabled={enclosureStatusFilter === 'inactive'}
									>
										<Download className='h-3.5 w-3.5' />
										Export
									</Button>
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
									<span className='text-xs text-muted-foreground'>{selectedIds.size} selected</span>
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
										{selectMode ? 'Cancel' : 'Select'}
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
								{selectMode ? 'Cancel' : 'Select'}
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
					<InputGroup className='w-40 sm:w-60 ml-auto'>
						<InputGroupAddon>
							<Search className='h-4 w-4 text-muted-foreground' />
						</InputGroupAddon>
						<InputGroupInput
							placeholder='Search...'
							value={searchValue}
							onChange={(e) => {
								const val = e.target.value
								setSearchValue(val)
								setAppliedSearch(val.trim().toLowerCase())
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
					displayedSpecies.length <= TARGET_ROWS ? (
						<div className='rounded-lg border bg-card p-2 flex flex-col gap-2'>
							{displayedSpecies.map((sp) => (
								<SpeciesRow
									key={sp.id}
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
									onSelectAll={handleSelectAll}
								/>
							))}
						</div>
					) : (
						<div className='rounded-lg border bg-card'>
							<Virtuoso
								className='scrollbar-no-track'
								style={{ height: '680px' }}
								data={displayedSpecies}
								computeItemKey={(_, sp) => sp.id}
								increaseViewportBy={200}
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
											onSelectAll={handleSelectAll}
										/>
									</div>
								)}
							/>
						</div>
					)
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
							<CareInstructionDocs defaultDocs={defaultDocs ?? []} orgDocs={orgDocs ?? []} />
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
				<div className='flex flex-col gap-3'>
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
