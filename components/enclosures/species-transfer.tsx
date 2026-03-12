'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeftIcon, ChevronRightIcon, LoaderCircle, SaveIcon, SquareCheckIcon, SquareIcon } from 'lucide-react'
import { useState } from 'react'
import { useAllSpecies, useOrgSpecies } from '@/lib/react-query/queries'
import { useAddBatchSpeciesToOrg, useDeleteBatchSpeciesFromOrg } from '@/lib/react-query/mutations'
import { useParams } from 'next/navigation'
import { UUID } from 'crypto'
import RequestNewSpeciesButton from './request-new-species-button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { useMemberProfiles } from '@/lib/react-query/queries'

type Item = {
	key: string
	label: string
	scientificLabel?: string
	selected?: boolean
}

export default function SpeciesTransferList({ onClose }: { onClose?: () => void }) {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const { data: species, isLoading: orgSpeciesLoading } = useOrgSpecies(orgId as UUID)
	const { data: master_species, isLoading: speciesLoading } = useAllSpecies()

	const { data: user } = useCurrentClientUser()
	const { data: userProfile } = useMemberProfiles(user?.id ? [user.id] : [])
	const isSuperadmin = userProfile?.some((profile) => profile.is_superadmin === true)

	const [leftList, setLeftList] = useState<Item[]>([])
	const [rightList, setRightList] = useState<Item[]>([])
	const [prevSpecies, setPrevSpecies] = useState<typeof species | null>(null)
	const [prevMasterSpecies, setPrevMasterSpecies] = useState<typeof master_species | null>(null)
	const [leftSearch, setLeftSearch] = useState('')
	const [rightSearch, setRightSearch] = useState('')
	const [showScientific, setShowScientific] = useState(false)
	const [confirmOpen, setConfirmOpen] = useState(false)
	const [pendingSave, setPendingSave] = useState<{
		removedOrgSpeciesIds: UUID[]
		addedMasterIds: UUID[]
		removedNames: string
	} | null>(null)

	// Sync lists when query data changes ("setState during render" pattern)
	if (prevSpecies !== species || prevMasterSpecies !== master_species) {
		setPrevSpecies(species)
		setPrevMasterSpecies(master_species)
		if (species) {
			setLeftList(
				species.map((s) => ({
					key: s.master_species_id,
					label: s.custom_common_name || s.species?.scientific_name || '',
					scientificLabel: s.species?.scientific_name || ''
				}))
			)
		}
		if (master_species) {
			const orgSpeciesIds = new Set(species?.map((s) => s.master_species_id) ?? [])
			setRightList(
				master_species
					.filter((s) => !orgSpeciesIds.has(s.id))
					.map((s) => ({
						key: s.id,
						label: s.common_name || s.scientific_name,
						scientificLabel: s.scientific_name
					}))
			)
		}
	}

	const moveToRight = () => {
		const selectedItems = leftList.filter((item) => item.selected)
		setRightList((prev) => [...prev, ...selectedItems.map((i) => ({ ...i, selected: false }))])
		setLeftList((prev) => prev.filter((item) => !item.selected))
	}

	const moveToLeft = () => {
		const selectedItems = rightList.filter((item) => item.selected)
		setLeftList((prev) => [...prev, ...selectedItems.map((i) => ({ ...i, selected: false }))])
		setRightList((prev) => prev.filter((item) => !item.selected))
	}

	const toggleSelection = (setList: React.Dispatch<React.SetStateAction<Item[]>>, key: string) => {
		setList((prev) => prev.map((item) => (item.key === key ? { ...item, selected: !item.selected } : item)))
	}

	const toggleSelectAll = (list: Item[], setList: React.Dispatch<React.SetStateAction<Item[]>>, search: string) => {
		const getDisplayLabel = (item: Item) => (showScientific ? (item.scientificLabel ?? item.label) : item.label)
		const visibleKeys = new Set(
			list.filter((item) => getDisplayLabel(item).toLowerCase().includes(search.toLowerCase())).map((i) => i.key)
		)
		const allSelected = list.filter((i) => visibleKeys.has(i.key)).every((i) => i.selected)
		setList((prev) => prev.map((item) => (visibleKeys.has(item.key) ? { ...item, selected: !allSelected } : item)))
	}

	const addMutation = useAddBatchSpeciesToOrg()
	const deleteMutation = useDeleteBatchSpeciesFromOrg()

	const hasLeftSelected = leftList.some((item) => item.selected)
	const hasRightSelected = rightList.some((item) => item.selected)

	const handleSave = () => {
		if (!orgId) return

		const originalMasterIds = new Set(species?.map((s) => s.master_species_id) ?? [])
		const currentLeftKeys = new Set(leftList.map((item) => item.key))

		// Master species IDs that were moved out of the org list
		const removedMasterIds = [...originalMasterIds].filter((id) => !currentLeftKeys.has(id)) as UUID[]
		// Resolve to org_species.id for the delete mutation
		const removedOrgSpeciesIds = (species ?? [])
			.filter((s) => removedMasterIds.includes(s.master_species_id))
			.map((s) => s.id) as UUID[]

		// Master species IDs that were moved into the org list
		const addedMasterIds = leftList
			.filter((item) => !originalMasterIds.has(item.key as UUID))
			.map((item) => item.key as UUID)

		if (removedOrgSpeciesIds.length === 0 && addedMasterIds.length === 0) return

		if (removedOrgSpeciesIds.length > 0) {
			const removedNames = (species ?? [])
				.filter((s) => removedMasterIds.includes(s.master_species_id))
				.map((s) => s.custom_common_name || s.species?.scientific_name || '')
				.join(', ')
			setPendingSave({ removedOrgSpeciesIds, addedMasterIds, removedNames })
			setConfirmOpen(true)
			return
		}

		executeSave(removedOrgSpeciesIds, addedMasterIds)
	}

	const executeSave = (removedOrgSpeciesIds: UUID[], addedMasterIds: UUID[]) => {
		if (!orgId) return
		if (removedOrgSpeciesIds.length > 0) {
			deleteMutation.mutate({ species_ids: removedOrgSpeciesIds, orgId })
		}
		if (addedMasterIds.length > 0) {
			addMutation.mutate({ species_ids: addedMasterIds, org_id: orgId })
		}
	}

	if (speciesLoading || orgSpeciesLoading) {
		return (
			<div className='flex items-center justify-center h-48 w-full'>
				<LoaderCircle className='h-8 w-8 animate-spin text-muted-foreground' />
			</div>
		)
	}

	return (
		<>
			<div className='flex flex-col p-2 gap-2'>
				<div className='flex items-center justify-between'>
					<div className='flex items-center rounded-md border text-xs overflow-hidden'>
						<button
							className={`px-2.5 py-1 transition-colors ${!showScientific ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-background'}`}
							onClick={() => setShowScientific(false)}
						>
							Common
						</button>
						<button
							className={`px-2.5 py-1 transition-colors ${showScientific ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-background'}`}
							onClick={() => setShowScientific(true)}
						>
							Scientific
						</button>
					</div>
					{!isSuperadmin && <RequestNewSpeciesButton />}
				</div>
				<div className='flex gap-2'>
					<div className='w-1/2 shadow-sm bg-background rounded-sm'>
						<p>Organization List</p>
						<div className='flex items-center justify-between'>
							<Input
								placeholder='Search'
								className='rounded-br-none rounded-bl-none rounded-tr-none rounded-bl-none focus-visible:ring-0 focus-visible:border-blue-500'
								value={leftSearch}
								onChange={(e) => setLeftSearch(e.target.value)}
							/>
							<Button
								className='rounded-tl-none rounded-bl-none rounded-br-none border-l-0'
								onClick={moveToRight}
								size='icon'
								variant={hasLeftSelected ? 'default' : 'outline'}
							>
								<ChevronRightIcon className='h-4 w-4' />
							</Button>
						</div>
						<ul className='h-65 border-l border-r border-b rounded-br-sm rounded-bl-sm p-2 overflow-y-scroll scrollbar-no-track'>
							<li className='flex items-center text-sm hover:bg-muted rounded-sm'>
								<button
									className='flex items-start gap-1.5 w-full p-1.5 min-w-0'
									onClick={() => toggleSelectAll(leftList, setLeftList, leftSearch)}
								>
									{leftList
										.filter((i) =>
											(showScientific ? (i.scientificLabel ?? i.label) : i.label)
												.toLowerCase()
												.includes(leftSearch.toLowerCase())
										)
										.every((i) => i.selected) && leftList.length > 0 ? (
										<SquareCheckIcon className='h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/50' />
									) : (
										<SquareIcon className='h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/50' />
									)}
									<span className='text-left'>Select All</span>
								</button>
							</li>
							{leftList
								.filter((item) =>
									(showScientific ? (item.scientificLabel ?? item.label) : item.label)
										.toLowerCase()
										.includes(leftSearch.toLowerCase())
								)
								.map((item) => (
									<li className='flex items-center text-sm hover:bg-muted rounded-sm' key={item.key}>
										<button
											className='flex items-start gap-1.5 w-full p-1.5 min-w-0'
											onClick={() => toggleSelection(setLeftList, item.key)}
										>
											{item.selected ? (
												<SquareCheckIcon className='h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/50' />
											) : (
												<SquareIcon className='h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/50' />
											)}
											<span className='break-words text-left'>
												{showScientific ? (item.scientificLabel ?? item.label) : item.label}
											</span>
										</button>
									</li>
								))}
						</ul>
					</div>

					<div className='w-1/2 shadow-sm bg-background rounded-sm'>
						<p>Master List</p>
						<div className='flex items-center justify-between'>
							<Button
								className='rounded-tr-none rounded-br-none rounded-bl-none border-r-0'
								onClick={moveToLeft}
								size='icon'
								variant={hasRightSelected ? 'default' : 'outline'}
							>
								<ChevronLeftIcon className='h-4 w-4' />
							</Button>
							<Input
								placeholder='Search'
								className='rounded-bl-none rounded-br-none rounded-tl-none rounded-bl-none focus-visible:ring-0 focus-visible:border-blue-500'
								value={rightSearch}
								onChange={(e) => setRightSearch(e.target.value)}
							/>
						</div>
						<ul className='h-65 border-l border-r border-b rounded-br-sm rounded-bl-sm p-1.5 overflow-y-scroll scrollbar-no-track'>
							<li className='flex items-center text-sm hover:bg-muted rounded-sm'>
								<button
									className='flex items-start gap-1.5 w-full p-1.5 min-w-0'
									onClick={() => toggleSelectAll(rightList, setRightList, rightSearch)}
								>
									{rightList
										.filter((i) =>
											(showScientific ? (i.scientificLabel ?? i.label) : i.label)
												.toLowerCase()
												.includes(rightSearch.toLowerCase())
										)
										.every((i) => i.selected) && rightList.length > 0 ? (
										<SquareCheckIcon className='h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/50' />
									) : (
										<SquareIcon className='h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/50' />
									)}
									<span className='text-left'>Select All</span>
								</button>
							</li>
							{rightList
								.filter((item) =>
									(showScientific ? (item.scientificLabel ?? item.label) : item.label)
										.toLowerCase()
										.includes(rightSearch.toLowerCase())
								)
								.map((item) => (
									<li className='flex items-center text-sm hover:bg-muted rounded-sm' key={item.key}>
										<button
											className='flex items-start gap-1.5 w-full p-1.5 min-w-0'
											onClick={() => toggleSelection(setRightList, item.key)}
										>
											{item.selected ? (
												<SquareCheckIcon className='h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/50' />
											) : (
												<SquareIcon className='h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/50' />
											)}
											<span className='wrap-break-words text-left'>
												{showScientific ? (item.scientificLabel ?? item.label) : item.label}
											</span>
										</button>
									</li>
								))}
						</ul>
					</div>
					<div></div>
				</div>
			</div>
			<div className='flex flex-col gap-2'>
				<Button size='default' onClick={handleSave} disabled={addMutation.isPending || deleteMutation.isPending}>
					{addMutation.isPending || deleteMutation.isPending ? 'Saving...' : 'Save'}
					<SaveIcon className='w-4 h-4' />
				</Button>
				{onClose && (
					<Button
						size='default'
						variant='outline'
						onClick={onClose}
						disabled={addMutation.isPending || deleteMutation.isPending}
					>
						Cancel
					</Button>
				)}
			</div>

			<ResponsiveDialogDrawer
				title='Remove Species'
				description={`Removing ${pendingSave?.removedOrgSpeciesIds.length ?? 0} species (${pendingSave?.removedNames ?? ''}) will permanently delete all associated enclosures, notes, and tasks. This cannot be undone.`}
				trigger={null}
				open={confirmOpen}
				onOpenChange={(open) => {
					if (!open) setPendingSave(null)
					setConfirmOpen(open)
				}}
			>
				<Button
					variant='destructive'
					disabled={deleteMutation.isPending || addMutation.isPending}
					onClick={() => {
						if (!pendingSave) return
						executeSave(pendingSave.removedOrgSpeciesIds, pendingSave.addedMasterIds)
						setConfirmOpen(false)
						setPendingSave(null)
					}}
				>
					{deleteMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Confirm'}
				</Button>
			</ResponsiveDialogDrawer>
		</>
	)
}
