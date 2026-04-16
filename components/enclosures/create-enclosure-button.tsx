'use client'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PlusIcon, LoaderCircle, X } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useCreateEnclosure, useCreateLocation } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { OrgSpecies, type Enclosure, useOrgEnclosures, useOrgLocations, useOrgSpecies } from '@/lib/react-query/queries'
import { useParams } from 'next/navigation'
import {
	Combobox,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList
} from '../ui/combobox'
import { UUID } from 'crypto'
import { Badge } from '../ui/badge'

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
	const [species, setSpecies] = useState('')
	const [speciesQuery, setSpeciesQuery] = useState('')
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
	const { data: user } = useCurrentClientUser()
	const createEnclosureMutation = useCreateEnclosure()
	const createLocationMutation = useCreateLocation()
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined

	const [createLocation, setCreateLocation] = useState(false)

	const { data: orgSpecies } = useOrgSpecies(orgId as UUID)
	const { data: orgLocations } = useOrgLocations(orgId as UUID)
	const { data: orgEnclosures } = useOrgEnclosures(orgId as UUID)

	const scoreMatch = (str: string | undefined, val: string): number => {
		if (!str) return -1
		const s = str.trim().toLowerCase()
		if (s === val) return 0
		if (s.startsWith(val)) return 1
		if (s.includes(val)) return 2
		return -1
	}

	const filteredSpecies = useMemo(() => {
		if (!speciesQuery.trim()) return orgSpecies ?? []
		const val = speciesQuery.trim().toLowerCase()
		return (orgSpecies ?? [])
			.map((spec) => {
				const field = showScientific ? spec.species?.scientific_name : spec.custom_common_name
				return { spec, score: scoreMatch(field, val) }
			})
			.filter(({ score }) => score >= 0)
			.sort((a, b) => a.score - b.score)
			.map(({ spec }) => spec)
	}, [speciesQuery, orgSpecies, showScientific])

	const filteredLocations = useMemo(() => {
		if (!locationQuery.trim()) return orgLocations ?? []
		const val = locationQuery.trim().toLowerCase()
		return (orgLocations ?? [])
			.map((loc) => {
				return { loc, score: scoreMatch(loc.name, val) }
			})
			.filter(({ score }) => score >= 0)
			.sort((a, b) => a.score - b.score)
			.map(({ loc }) => loc)
	}, [locationQuery, orgLocations])

	const selectedSpecies = useMemo(
		() => orgSpecies?.find((spec) => spec?.custom_common_name === species),
		[orgSpecies, species]
	)

	const selectedSpeciesId = selectedSpecies?.id

	const filteredEnclosures = useMemo(() => {
		const speciesFiltered = (orgEnclosures ?? []).filter(
			(encl) => encl.institutional_specimen_id && (!selectedSpeciesId || encl.species_id === selectedSpeciesId)
		)
		if (!specimenTrackingId.trim()) return speciesFiltered
		const val = specimenTrackingId.trim().toLowerCase()
		return speciesFiltered
			.map((encl) => ({ encl, score: scoreMatch(encl.institutional_specimen_id, val) }))
			.filter(({ score }) => score >= 0)
			.sort((a, b) => a.score - b.score)
			.map(({ encl }) => encl)
	}, [specimenTrackingId, orgEnclosures, selectedSpeciesId])

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

	const isPending = createEnclosureMutation.isPending || createLocationMutation.isPending

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!species || !location || !lifeStage) return

		const species_id = selectedSpecies
		if (!species_id) return

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
				species_id: species_id.id as UUID,
				location: resolvedLocationId,
				current_count: count ?? 0,
				life_stage: lifeStage,
				institutional_external_source: externalSources.length > 0 ? externalSources.join(', ') : undefined,
				institutional_specimen_id: specimenTrackingId.trim() || undefined,
				source_enclosure_transfers: enclosureSources.length > 0 ? enclosureSources : undefined
			},
			{
				onSuccess: () => {
					setOpen(false)
					setSpecies('')
					setSpeciesQuery('')
					setCreateLocation(false)
					setLocation('')
					setLocationQuery('')
					setCount(undefined)
					setLifeStage('')
					setSourceType('institution')
					setExternalSource('')
					setSourceEnclosureQuery('')
					setSpecimenTrackingId('')
					setSources([])
				}
			}
		)
	}

	return (
		<ResponsiveDialogDrawer
			title='Create Enclosure'
			description='Species, location, and count are required'
			open={open}
			onOpenChange={(isOpen) => setOpen(isOpen)}
			trigger={
				controlled ? null : (
					<Button onClick={() => setOpen(true)} size='default'>
						Add Enclosure <PlusIcon className='w-4 h-4' />
					</Button>
				)
			}
		>
			<form onSubmit={handleSubmit} className='flex flex-col gap-4'>
				<div className='grid grid-cols-1 gap-4'>
					<div className='flex items-center justify-between'>
						<Label>Species</Label>
						<div className='flex items-center rounded-md border text-xs overflow-hidden w-34'>
							<button
								type='button'
								className={`w-full text-center px-2.5 py-1 transition-colors ${!showScientific ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-background'}`}
								onClick={() => {
									setShowScientific(false)
									setSpeciesQuery(species ?? '')
								}}
							>
								Common
							</button>
							<button
								type='button'
								className={`w-full text-center px-2.5 py-1 transition-colors ${showScientific ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-background'}`}
								onClick={() => {
									setShowScientific(true)
									const scientificName = orgSpecies?.find((s) => s.custom_common_name === species)?.species
										?.scientific_name
									setSpeciesQuery(scientificName ?? '')
								}}
							>
								Scientific
							</button>
						</div>
					</div>
					<Combobox
						items={filteredSpecies}
						filter={() => true}
						value={species}
						onValueChange={(value) => {
							setSpecies(value ?? '')
							setSpeciesQuery(value ?? '')
						}}
					>
						<ComboboxInput
							className='h-9'
							placeholder='Search species...'
							value={speciesQuery}
							onChange={(event) => setSpeciesQuery(event.target.value)}
							disabled={isPending}
							showClear
						/>
						<ComboboxContent>
							<ComboboxEmpty>No matching species.</ComboboxEmpty>
							<ComboboxList className='max-h-42 scrollbar-no-track'>
								<ComboboxCollection>
									{(spec: OrgSpecies) => (
										<ComboboxItem key={spec.id} value={spec.custom_common_name}>
											{showScientific ? (
												<span className='flex flex-col'>
													<span>{spec.species?.scientific_name}</span>
													<span className='text-xs text-muted-foreground'>{spec.custom_common_name}</span>
												</span>
											) : (
												spec.custom_common_name
											)}
										</ComboboxItem>
									)}
								</ComboboxCollection>
							</ComboboxList>
						</ComboboxContent>
					</Combobox>
					<div className='flex items-center justify-between'>
						<Label>Enclosure Location</Label>
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
					<div className='grid grid-cols-2 gap-4'>
						<div className='flex flex-col gap-2'>
							<Label>Count</Label>
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
								required
								disabled={isPending}
							/>
						</div>
						<div className='flex flex-col gap-2'>
							<Label>Life Stage</Label>
							<Select
								value={lifeStage}
								onValueChange={(v) => setLifeStage(v as 'egg' | 'larva' | 'pupa' | 'nymph' | 'adult')}
							>
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
					<Label>Specimen ID (Optional)</Label>
					<Combobox
						items={filteredEnclosures}
						filter={() => true}
						value={specimenTrackingId}
						onValueChange={(value) => setSpecimenTrackingId(value ?? '')}
					>
						<ComboboxInput
							className='h-9'
							placeholder='Tracking ID...'
							value={specimenTrackingId}
							onChange={(event) => setSpecimenTrackingId(event.target.value)}
							disabled={isPending || !speciesQuery}
							showClear
						/>
						<ComboboxContent>
							<ComboboxEmpty>Create new tracking id</ComboboxEmpty>
							<ComboboxList className='max-h-42 scrollbar-no-track'>
								<ComboboxCollection>
									{(encl: Enclosure) => (
										<ComboboxItem key={encl.id} value={encl.institutional_specimen_id!}>
											<span className='flex flex-col'>
												<span>{encl.institutional_specimen_id}</span>
												<small className='text-muted-foreground'>{encl.name}</small>
											</span>
										</ComboboxItem>
									)}
								</ComboboxCollection>
							</ComboboxList>
						</ComboboxContent>
					</Combobox>
					<div className='flex items-center justify-between'>
						<Label>Source</Label>
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
											{ type: 'institution', value: externalSource.trim(), label: externalSource.trim(), count: '' }
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
										{ type: 'institution', value: externalSource.trim(), label: externalSource.trim(), count: '' }
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
											label: `${selected.name} (${selected.locations?.name ?? 'Unknown'})`,
											count: '',
											maxCount: selected.current_count
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
				<div className='flex flex-col gap-3 justify-center'>
					<Button type='submit' disabled={isPending || !user || !species || !location || count === undefined}>
						{isPending ? <LoaderCircle className='animate-spin' /> : 'Create Enclosure'}
					</Button>
					<Button type='button' variant='outline' size='default' disabled={isPending} onClick={() => setOpen(false)}>
						Cancel
					</Button>
				</div>
			</form>
		</ResponsiveDialogDrawer>
	)
}
