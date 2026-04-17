'use client'

import { useState, useMemo } from 'react'
import { PlusIcon, LoaderCircle, X, ChevronDown } from 'lucide-react'
import { useParams } from 'next/navigation'
import { UUID } from 'crypto'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import {
	Combobox,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList
} from '@/components/ui/combobox'
import { VirtualizedCommand, type VirtualizedOption } from '@/components/ui/virtualized-combobox'

import { useCreateEnclosure, useCreateLocation } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { type Enclosure, useOrgEnclosures, useOrgLocations, useOrgSpecies } from '@/lib/react-query/queries'

// ─── Types ────────────────────────────────────────────────────────────────────

type CreationType = 'single' | 'batch'

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateEnclosureButton({
	open: propsOpen,
	onOpenChange: propsOnOpenChange
}: {
	open?: boolean
	onOpenChange?: (open: boolean) => void
} = {}) {
	const controlled = propsOpen !== undefined
	const [localOpen, setLocalOpen] = useState(false)
	const open = controlled ? propsOpen! : localOpen
	const setOpen = controlled ? (val: boolean) => propsOnOpenChange?.(val) : setLocalOpen

	// Creation type
	const [creationType, setCreationType] = useState<CreationType>('single')
	const [batchCount, setBatchCount] = useState<number | undefined>(undefined)

	// Form fields
	const [species, setSpecies] = useState('')
	const [speciesOpen, setSpeciesOpen] = useState(false)
	const [showScientific, setShowScientific] = useState(false)
	const [location, setLocation] = useState('')
	const [locationQuery, setLocationQuery] = useState('')
	const [specimenTrackingId, setSpecimenTrackingId] = useState('')
	const [count, setCount] = useState<number | undefined>(undefined)
	const [sourceType, setSourceType] = useState<'institution' | 'enclosure'>('institution')
	const [externalSource, setExternalSource] = useState('')
	const [sourceEnclosureQuery, setSourceEnclosureQuery] = useState('')
	const [sources, setSources] = useState<{ type: 'institution' | 'enclosure'; value: string; label: string }[]>([])
	const [lifeStage, setLifeStage] = useState<'egg' | 'larva' | 'pupa' | 'nymph' | 'adult' | ''>('')
	const [createLocation, setCreateLocation] = useState(false)

	const { data: user } = useCurrentClientUser()
	const createEnclosureMutation = useCreateEnclosure()
	const createLocationMutation = useCreateLocation()
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined

	const { data: orgSpecies } = useOrgSpecies(orgId as UUID)
	const { data: orgLocations } = useOrgLocations(orgId as UUID)
	const { data: orgEnclosures } = useOrgEnclosures(orgId as UUID)

	const isPending = createEnclosureMutation.isPending || createLocationMutation.isPending

	// ── Filtering helpers ────────────────────────────────────────────────────

	const scoreMatch = (str: string | undefined, val: string): number => {
		if (!str) return -1
		const s = str.trim().toLowerCase()
		if (s === val) return 0
		if (s.startsWith(val)) return 1
		if (s.includes(val)) return 2
		return -1
	}

	const speciesOptions = useMemo<VirtualizedOption[]>(
		() =>
			(orgSpecies ?? []).map((spec) => ({
				value: spec.custom_common_name,
				label: showScientific ? (spec.species?.scientific_name ?? spec.custom_common_name) : spec.custom_common_name,
				subLabel: showScientific ? spec.custom_common_name : (spec.species?.scientific_name ?? undefined)
			})),
		[orgSpecies, showScientific]
	)

	const filteredLocations = useMemo(() => {
		if (!locationQuery.trim()) return orgLocations ?? []
		const val = locationQuery.trim().toLowerCase()
		return (orgLocations ?? [])
			.map((loc) => ({ loc, score: scoreMatch(loc.name, val) }))
			.filter(({ score }) => score >= 0)
			.sort((a, b) => a.score - b.score)
			.map(({ loc }) => loc)
	}, [locationQuery, orgLocations])

	const selectedSpecies = useMemo(
		() => orgSpecies?.find((spec) => spec?.custom_common_name === species),
		[orgSpecies, species]
	)
	const selectedSpeciesId = selectedSpecies?.id

	const specimenIdOptions = useMemo(() => {
		const speciesFiltered = (orgEnclosures ?? []).filter(
			(encl) => encl.institutional_specimen_id && (!selectedSpeciesId || encl.species_id === selectedSpeciesId)
		)
		const map = new Map<string, number>()
		for (const encl of speciesFiltered) {
			const id = encl.institutional_specimen_id!
			map.set(id, (map.get(id) ?? 0) + 1)
		}
		return Array.from(map.entries()).map(([id, count]) => ({ id, count }))
	}, [orgEnclosures, selectedSpeciesId])

	const filteredSpecimenIds = useMemo(() => {
		if (!specimenTrackingId.trim()) return specimenIdOptions
		const val = specimenTrackingId.trim().toLowerCase()
		return specimenIdOptions
			.map((opt) => ({ opt, score: scoreMatch(opt.id, val) }))
			.filter(({ score }) => score >= 0)
			.sort((a, b) => a.score - b.score)
			.map(({ opt }) => opt)
	}, [specimenTrackingId, specimenIdOptions])

	const sourceEnclosureOptions = useMemo(() => {
		if (!selectedSpeciesId) return []
		const alreadyAdded = new Set(sources.filter((s) => s.type === 'enclosure').map((s) => s.value))
		return (orgEnclosures ?? []).filter(
			(enc) => enc.species_id === selectedSpeciesId && !alreadyAdded.has(enc.id) && enc.current_count > 0
		)
	}, [orgEnclosures, selectedSpeciesId, sources])

	const filteredSourceEnclosures = useMemo(() => {
		if (!sourceEnclosureQuery.trim()) return sourceEnclosureOptions
		const val = sourceEnclosureQuery.trim().toLowerCase()
		return sourceEnclosureOptions
			.map((enc) => ({ enc, score: scoreMatch(enc.name, val) }))
			.filter(({ score }) => score >= 0)
			.sort((a, b) => a.score - b.score)
			.map(({ enc }) => enc)
	}, [sourceEnclosureOptions, sourceEnclosureQuery])

	// ── Reset ────────────────────────────────────────────────────────────────

	const reset = () => {
		setCreationType('single')
		setBatchCount(undefined)
		setSpecies('')
		setSpeciesOpen(false)
		setShowScientific(false)
		setCreateLocation(false)
		setLocation('')
		setLocationQuery('')
		setCount(undefined)
		setSourceType('institution')
		setExternalSource('')
		setSourceEnclosureQuery('')
		setSpecimenTrackingId('')
		setSources([])
		setLifeStage('')
	}

	// ── Submit ────────────────────────────────────────────────────────────────

	const handleSubmit = async () => {
		if (!species) {
			toast.error('Please select a species.')
			return
		}
		if (!location) {
			toast.error('Please select a location.')
			return
		}
		if (count === undefined) {
			toast.error('Please enter a count.')
			return
		}
		if (!lifeStage) {
			toast.error('Please select a life stage.')
			return
		}
		if (creationType === 'batch' && (!batchCount || batchCount < 1)) {
			toast.error('Please enter a number of enclosures.')
			return
		}
		if (creationType === 'batch' && (batchCount ?? 0) > 500) {
			toast.error('Cannot batch create more than 500 enclosures at once.')
			return
		}

		const selectedSpeciesObj = orgSpecies?.find((spec) => spec?.custom_common_name === species)
		if (!selectedSpeciesObj) return

		let resolvedLocationId: UUID

		if (createLocation) {
			const newLoc = await createLocationMutation.mutateAsync({
				orgId: orgId as UUID,
				name: location
			})
			resolvedLocationId = newLoc.id as UUID
		} else {
			const existing = orgLocations?.find((loc) => loc?.name === location)
			if (!existing) return
			resolvedLocationId = existing.id as UUID
		}

		const externalSources = sources.filter((s) => s.type === 'institution').map((s) => s.value)
		const enclosureSources = sources
			.filter((s) => s.type === 'enclosure')
			.map((s) => ({ id: s.value as UUID, count: 0 }))

		createEnclosureMutation.mutate(
			{
				orgId: orgId as UUID,
				species_id: selectedSpeciesObj.id as UUID,
				location: resolvedLocationId,
				current_count: count,
				quantity: creationType === 'batch' ? (batchCount ?? 1) : 1,
				life_stage: lifeStage as 'egg' | 'larva' | 'pupa' | 'nymph' | 'adult',
				institutional_external_source: externalSources.length > 0 ? externalSources.join(', ') : undefined,
				institutional_specimen_id: specimenTrackingId.trim() || undefined,
				source_enclosure_transfers: enclosureSources.length > 0 ? enclosureSources : undefined
			},
			{
				onSuccess: () => {
					setOpen(false)
					reset()
				}
			}
		)
	}

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<ResponsiveDialogDrawer
			title='Create Enclosure'
			description='Species, location, and count are required.'
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) reset()
				setOpen(isOpen)
			}}
			className='sm:max-w-2xl'
			trigger={
				controlled ? null : (
					<Button onClick={() => setOpen(true)} size='default'>
						Add Enclosure <PlusIcon className='w-4 h-4' />
					</Button>
				)
			}
			footer={
				<div className='flex gap-2 w-full'>
					<Button
						type='button'
						className='flex-1'
						disabled={isPending || !user || !species || !location || count === undefined}
						onClick={handleSubmit}
					>
						{isPending ? (
							<LoaderCircle className='h-4 w-4 animate-spin' />
						) : creationType === 'batch' ? (
							`Create ${batchCount ?? '?'} Enclosure${(batchCount ?? 0) === 1 ? '' : 's'}`
						) : (
							'Create Enclosure'
						)}
					</Button>
				</div>
			}
		>
			<div data-vaul-no-drag className='overflow-y-auto flex-1 min-h-0 space-y-5 pl-1 pr-5 pb-4'>
				{/* ── Creation Type ── */}
				<div className='space-y-2'>
					<Label className='text-sm font-semibold'>Creation Type</Label>
					<RadioGroup
						value={creationType}
						onValueChange={(v) => setCreationType(v as CreationType)}
						className='space-y-1'
					>
						{(
							[
								{
									value: 'single',
									label: 'Single Enclosure',
									desc: 'Create one new enclosure'
								},
								{
									value: 'batch',
									label: 'Batch Enclosures',
									desc: 'Create multiple enclosures with the same data'
								}
							] as const
						).map(({ value, label, desc }) => (
							<label
								key={value}
								htmlFor={`enctype-${value}`}
								className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2 transition-colors ${
									creationType === value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
								}`}
							>
								<RadioGroupItem value={value} id={`enctype-${value}`} />
								<div className='min-w-0'>
									<p className='text-sm font-medium'>{label}</p>
									<p className='text-xs text-muted-foreground'>{desc}</p>
								</div>
							</label>
						))}
					</RadioGroup>
				</div>

				{/* ── Batch Count ── */}
				{creationType === 'batch' && (
					<div className='space-y-1'>
						<Label className='text-sm'>
							Number of Enclosures <span className='text-destructive'>*</span>
						</Label>
						<Input
							type='number'
							min='1'
							placeholder='Count'
							value={batchCount ?? ''}
							onChange={(e) => {
								if (e.target.value === '') {
									setBatchCount(undefined)
									return
								}
								const val = parseInt(e.target.value, 10)
								if (!isNaN(val) && val >= 1) setBatchCount(val)
							}}
							onFocus={(e) => e.target.select()}
							onKeyDown={(e) => {
								if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault()
							}}
							className='w-28'
							disabled={isPending}
						/>
					</div>
				)}

				<Separator />

				{/* ── Species ── */}
				<div className='space-y-2'>
					<div className='flex items-center justify-between'>
						<Label>
							Species <span className='text-destructive'>*</span>
						</Label>
						<div className='flex items-center rounded-md border text-xs overflow-hidden w-34'>
							<button
								type='button'
								className={`w-full text-center px-2.5 py-1 transition-colors ${!showScientific ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-background'}`}
								onClick={() => setShowScientific(false)}
							>
								Common
							</button>
							<button
								type='button'
								className={`w-full text-center px-2.5 py-1 transition-colors ${showScientific ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-background'}`}
								onClick={() => setShowScientific(true)}
							>
								Scientific
							</button>
						</div>
					</div>
					<button
						type='button'
						disabled={isPending}
						onClick={() => setSpeciesOpen((v) => !v)}
						className={`flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
							speciesOpen
								? 'border-ring ring-ring/50 ring-[3px]'
								: 'border-input hover:bg-accent hover:text-accent-foreground'
						} bg-background disabled:cursor-not-allowed disabled:opacity-50`}
					>
						<span className={`truncate ${species ? '' : 'text-muted-foreground'}`}>
							{species ? (speciesOptions.find((o) => o.value === species)?.label ?? species) : 'Search species...'}
						</span>
						<ChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
					</button>
					{speciesOpen && (
						<div className='rounded-md border overflow-hidden'>
							<VirtualizedCommand
								height='300'
								options={speciesOptions}
								placeholder='Search species...'
								selectedOption={species}
								emptyMessage='No matching species.'
								onSelectOption={(value) => {
									setSpecies(value === species ? '' : value)
									setSpeciesOpen(false)
								}}
							/>
						</div>
					)}
				</div>

				{/* ── Location ── */}
				<div className='space-y-2'>
					<div className='flex items-center justify-between'>
						<Label>
							Enclosure Location <span className='text-destructive'>*</span>
						</Label>
						<div className='flex items-center rounded-md border text-xs overflow-hidden w-34'>
							<button
								type='button'
								className={`w-full text-center px-2.5 py-1 transition-colors ${!createLocation ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-background'}`}
								onClick={() => {
									setCreateLocation(false)
									setLocation('')
									setLocationQuery('')
								}}
							>
								Search
							</button>
							<button
								type='button'
								className={`w-full text-center px-2.5 py-1 transition-colors ${createLocation ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-background'}`}
								onClick={() => {
									setCreateLocation(true)
									setLocation('')
									setLocationQuery('')
								}}
							>
								Create
							</button>
						</div>
					</div>
					{createLocation ? (
						<Input
							className='h-9'
							placeholder='New location name...'
							value={location}
							onChange={(e) => setLocation(e.target.value)}
							disabled={isPending}
						/>
					) : (
						<Combobox
							items={filteredLocations}
							filter={() => true}
							value={location}
							onValueChange={(value) => {
								setLocation(value ?? '')
								setLocationQuery(value ?? '')
							}}
						>
							<ComboboxInput
								className='h-9'
								placeholder='Search locations...'
								value={locationQuery}
								onChange={(event) => setLocationQuery(event.target.value)}
								disabled={isPending}
								showClear
							/>
							<ComboboxContent>
								<ComboboxEmpty>No matching locations.</ComboboxEmpty>
								<ComboboxList className='max-h-42 scrollbar-no-track'>
									<ComboboxCollection>
										{(loc) => (
											<ComboboxItem key={loc.id} value={loc.name}>
												{loc.name}
											</ComboboxItem>
										)}
									</ComboboxCollection>
								</ComboboxList>
							</ComboboxContent>
						</Combobox>
					)}
				</div>

				{/* ── Count + Life Stage ── */}
				<div className='grid grid-cols-2 gap-4'>
					<div className='flex flex-col gap-2'>
						<Label>
							Count <span className='text-destructive'>*</span>
						</Label>
						<Input
							className='h-9'
							placeholder='Count'
							value={count ?? ''}
							type='number'
							min='0'
							onKeyDown={(e) => {
								if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault()
							}}
							onChange={(e) => {
								if (e.target.value === '') {
									setCount(undefined)
									return
								}
								const num = Number(e.target.value)
								if (num < 0) return
								setCount(num)
							}}
							onFocus={(e) => e.target.select()}
							disabled={isPending}
						/>
						{creationType === 'batch' && (
							<p className='text-xs text-muted-foreground'>
								Each of the {batchCount} enclosures will start with this count.
							</p>
						)}
					</div>
					<div className='flex flex-col gap-2'>
						<Label>
							Life Stage <span className='text-destructive'>*</span>
						</Label>
						<Select value={lifeStage} onValueChange={(v) => setLifeStage(v as typeof lifeStage)}>
							<SelectTrigger className='h-9 w-full'>
								<SelectValue placeholder='Select stage...' />
							</SelectTrigger>
							<SelectContent>
								{(['egg', 'larva', 'pupa', 'nymph', 'adult'] as const).map((stage) => (
									<SelectItem key={stage} value={stage}>
										{stage.charAt(0).toUpperCase() + stage.slice(1)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* ── Specimen Tracking ID ── */}
				<div className='space-y-1'>
					<Label>
						Specimen Tracking ID <span className='text-muted-foreground font-normal text-xs'>(optional)</span>
					</Label>
					<Combobox
						items={filteredSpecimenIds}
						filter={() => true}
						value={specimenTrackingId}
						onValueChange={(value) => setSpecimenTrackingId(value ?? '')}
					>
						<ComboboxInput
							className='h-9'
							placeholder='Specimen tracking ID...'
							value={specimenTrackingId}
							onChange={(event) => setSpecimenTrackingId(event.target.value)}
							disabled={isPending || !species}
							showClear
						/>
						<ComboboxContent>
							<ComboboxEmpty>
								{specimenTrackingId.trim()
									? `"${specimenTrackingId.trim()}" will be used as a new ID`
									: 'No existing IDs found.'}
							</ComboboxEmpty>
							<ComboboxList className='max-h-42 scrollbar-no-track'>
								<ComboboxCollection>
									{(opt: { id: string; count: number }) => (
										<ComboboxItem key={opt.id} value={opt.id}>
											<span className='flex flex-col'>
												<span>{opt.id}</span>
												<small className='text-muted-foreground'>
													Used by {opt.count} enclosure{opt.count !== 1 ? 's' : ''}
												</small>
											</span>
										</ComboboxItem>
									)}
								</ComboboxCollection>
							</ComboboxList>
						</ComboboxContent>
					</Combobox>
				</div>

				{/* ── Source ── */}
				<div className='space-y-2'>
					<div className='flex items-center justify-between'>
						<Label>
							Source <span className='text-muted-foreground font-normal text-xs'>(optional)</span>
						</Label>
						<div className='flex items-center rounded-md border text-xs overflow-hidden w-44'>
							<button
								type='button'
								className={`w-full text-center px-2.5 py-1 transition-colors ${sourceType === 'institution' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-background'}`}
								onClick={() => setSourceType('institution')}
							>
								External
							</button>
							<button
								type='button'
								className={`w-full text-center px-2.5 py-1 transition-colors ${sourceType === 'enclosure' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-background'}`}
								onClick={() => setSourceType('enclosure')}
							>
								Enclosure
							</button>
						</div>
					</div>

					{sourceType === 'institution' ? (
						<div className='flex gap-2'>
							<Input
								className='h-9'
								placeholder={selectedSpecies ? 'Institution or external source...' : 'Select species first...'}
								value={externalSource}
								onChange={(e) => setExternalSource(e.target.value)}
								disabled={isPending || !selectedSpecies}
								onKeyDown={(e) => {
									if (e.key === 'Enter' && externalSource.trim()) {
										e.preventDefault()
										setSources((prev) => [
											...prev,
											{ type: 'institution', value: externalSource.trim(), label: externalSource.trim() }
										])
										setExternalSource('')
									}
								}}
							/>
							<Button
								type='button'
								size='sm'
								variant='secondary'
								className='h-9 px-3'
								disabled={!externalSource.trim() || isPending || !selectedSpecies}
								onClick={() => {
									setSources((prev) => [
										...prev,
										{ type: 'institution', value: externalSource.trim(), label: externalSource.trim() }
									])
									setExternalSource('')
								}}
							>
								<PlusIcon className='w-4 h-4' />
							</Button>
						</div>
					) : (
						<Combobox
							items={filteredSourceEnclosures}
							filter={() => true}
							value=''
							onValueChange={(value) => {
								if (!value) return
								const selected = sourceEnclosureOptions.find((enc) => enc.id === value)
								if (selected) {
									setSources((prev) => [
										...prev,
										{
											type: 'enclosure',
											value: selected.id,
											label: `${selected.name} (${selected.locations?.name ?? 'Unknown'})`
										}
									])
								}
								setSourceEnclosureQuery('')
							}}
						>
							<ComboboxInput
								className='h-9'
								placeholder={selectedSpecies ? 'Search source enclosure...' : 'Select species first...'}
								value={sourceEnclosureQuery}
								onChange={(event) => setSourceEnclosureQuery(event.target.value)}
								disabled={isPending || !selectedSpecies}
								showClear
							/>
							<ComboboxContent>
								<ComboboxEmpty>
									{selectedSpecies ? 'No matching enclosures for this species.' : 'Select a species first.'}
								</ComboboxEmpty>
								<ComboboxList className='max-h-42 scrollbar-no-track'>
									<ComboboxCollection>
										{(enc: Enclosure) => (
											<ComboboxItem key={enc.id} value={enc.id}>
												<span className='flex flex-col'>
													<span>{enc.name}</span>
													<span className='text-xs text-muted-foreground'>
														{enc.locations?.name ?? 'Unknown location'} • Count {enc.current_count}
													</span>
												</span>
											</ComboboxItem>
										)}
									</ComboboxCollection>
								</ComboboxList>
							</ComboboxContent>
						</Combobox>
					)}

					{sources.length > 0 && (
						<div className='flex flex-wrap gap-2'>
							{sources.map((source, idx) => (
								<Badge
									key={`${source.type}-${source.value}-${idx}`}
									variant={source.type === 'institution' ? 'outline' : 'secondary'}
									className='flex items-center gap-1 pr-1'
								>
									<span className='text-xs'>{source.label}</span>
									<button
										type='button'
										className='ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5'
										onClick={() => setSources((prev) => prev.filter((_, i) => i !== idx))}
									>
										<X className='h-3 w-3' />
									</button>
								</Badge>
							))}
						</div>
					)}
				</div>
			</div>
		</ResponsiveDialogDrawer>
	)
}
