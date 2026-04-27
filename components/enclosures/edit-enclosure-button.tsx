'use client'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoaderCircle, Edit2Icon, X, PlusIcon } from 'lucide-react'
import { useState, useMemo, useRef } from 'react'
import { useUpdateEnclosure, useCreateLocation } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import {
	Enclosure,
	OrgSpecies,
	useEnclosureLineage,
	useOrgEnclosures,
	useOrgLocations
} from '@/lib/react-query/queries'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { UUID } from 'crypto'
import { toast } from 'sonner'
import { Badge } from '../ui/badge'

export function EditEnclosureButton({ enclosure, spec }: { enclosure: Enclosure; spec: OrgSpecies }) {
	const [open, setOpen] = useState(false)
	const [species, setSpecies] = useState(spec?.custom_common_name)
	const [location, setLocation] = useState(enclosure.locations?.name)
	const [locationQuery, setLocationQuery] = useState(location ?? '')
	const [createLocation, setCreateLocation] = useState(false)
	const savedLocationRef = useRef<string | undefined>(undefined)
	const [count, setCount] = useState<number | undefined>(enclosure?.current_count)
	const [isActive, setIsActive] = useState(enclosure?.is_active ?? true)
	const [specimenTrackingId, setSpecimenTrackingId] = useState(enclosure?.institutional_specimen_id ?? '')
	const [lifeStage, setLifeStage] = useState<'egg' | 'larva' | 'pupa' | 'nymph' | 'adult'>(enclosure?.life_stage ?? '')
	const [sourceType, setSourceType] = useState<'institution' | 'enclosure'>('institution')
	const [externalSource, setExternalSource] = useState('')
	const [sourceEnclosureQuery, setSourceEnclosureQuery] = useState('')
	const [sources, setSources] = useState<{ type: 'institution' | 'enclosure'; value: string; label: string }[]>([])
	const { data: user } = useCurrentClientUser()
	const editEnclosureMutation = useUpdateEnclosure()
	const createLocationMutation = useCreateLocation()
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined

	const { data: orgLocations } = useOrgLocations(orgId as UUID)
	const { data: orgEnclosures } = useOrgEnclosures(orgId as UUID)
	const { data: lineageData } = useEnclosureLineage(enclosure.id)

	const scoreMatch = (str: string | undefined, val: string): number => {
		if (!str) return -1
		const s = str.trim().toLowerCase()
		if (s === val) return 0
		if (s.startsWith(val)) return 1
		if (s.includes(val)) return 2
		return -1
	}

	const filteredLocations = useMemo(() => {
		if (!locationQuery.trim()) return orgLocations ?? []
		const val = locationQuery.trim().toLowerCase()
		return (orgLocations ?? [])
			.map((loc) => ({ loc, score: scoreMatch(loc.name, val) }))
			.filter(({ score }) => score >= 0)
			.sort((a, b) => a.score - b.score)
			.map(({ loc }) => loc)
	}, [locationQuery, orgLocations])

	const sourceEnclosureOptions = useMemo(() => {
		const alreadyAdded = new Set(sources.filter((s) => s.type === 'enclosure').map((s) => s.value))
		return (orgEnclosures ?? []).filter(
			(enc) =>
				enc.species_id === spec.id && enc.id !== enclosure.id && !alreadyAdded.has(enc.id) && enc.current_count > 0
		)
	}, [orgEnclosures, spec.id, enclosure.id, sources])

	const filteredSourceEnclosures = useMemo(() => {
		if (!sourceEnclosureQuery.trim()) return sourceEnclosureOptions
		const val = sourceEnclosureQuery.trim().toLowerCase()
		return sourceEnclosureOptions
			.map((enc) => ({ enc, score: scoreMatch(enc.name, val) }))
			.filter(({ score }) => score >= 0)
			.sort((a, b) => a.score - b.score)
			.map(({ enc }) => enc)
	}, [sourceEnclosureOptions, sourceEnclosureQuery])

	const specimenIdOptions = useMemo(() => {
		const speciesFiltered = (orgEnclosures ?? []).filter(
			(encl) => encl.institutional_specimen_id && encl.species_id === spec.id && encl.id !== enclosure.id
		)
		const map = new Map<string, number>()
		for (const encl of speciesFiltered) {
			const id = encl.institutional_specimen_id!
			map.set(id, (map.get(id) ?? 0) + 1)
		}
		return Array.from(map.entries()).map(([id, count]) => ({ id, count }))
	}, [orgEnclosures, spec.id, enclosure.id])

	const filteredSpecimenIds = useMemo(() => {
		if (!specimenTrackingId.trim()) return specimenIdOptions
		const val = specimenTrackingId.trim().toLowerCase()
		return specimenIdOptions
			.map((opt) => ({ opt, score: scoreMatch(opt.id, val) }))
			.filter(({ score }) => score >= 0)
			.sort((a, b) => a.score - b.score)
			.map(({ opt }) => opt)
	}, [specimenTrackingId, specimenIdOptions])

	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen) {
			// Reset form state from latest props when dialog opens
			setSpecies(spec?.custom_common_name)
			setLocation(enclosure.locations?.name)
			setLocationQuery(enclosure.locations?.name ?? '')
			setCreateLocation(false)
			savedLocationRef.current = undefined
			setCount(enclosure?.current_count)
			setIsActive(enclosure?.is_active ?? true)
			setLifeStage(enclosure?.life_stage ?? '')
			setSpecimenTrackingId(enclosure?.institutional_specimen_id ?? '')
			setSourceType('institution')
			setExternalSource('')
			setSourceEnclosureQuery('')

			// Build sources from existing data
			const initialSources: { type: 'institution' | 'enclosure'; value: string; label: string }[] = []
			if (enclosure?.institutional_external_source) {
				enclosure.institutional_external_source
					.split(', ')
					.filter(Boolean)
					.forEach((src) => {
						initialSources.push({ type: 'institution', value: src, label: src })
					})
			}
			if (lineageData) {
				lineageData.forEach((record) => {
					const enc = orgEnclosures?.find((e) => e.id === record.source_enclosure_id)
					initialSources.push({
						type: 'enclosure',
						value: record.source_enclosure_id,
						label: enc ? `${enc.name} (${enc.locations?.name ?? 'Unknown'})` : record.source_enclosure_id
					})
				})
			}
			setSources(initialSources)
		}
		setOpen(isOpen)
	}

	const isPending = editEnclosureMutation.isPending || createLocationMutation.isPending

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!species || !location) return

		const externalSources = [
			...sources.filter((s) => s.type === 'institution').map((s) => s.value),
			...(externalSource.trim() ? [externalSource.trim()] : [])
		]
		const enclosureSourceIds = sources.filter((s) => s.type === 'enclosure').map((s) => s.value as UUID)
		const resolvedExternalSource = externalSources.length > 0 ? externalSources.join(', ') : ''

		const locationUnchanged = !createLocation && location === enclosure.locations?.name
		const originalLineageIds = new Set((lineageData ?? []).map((r) => r.source_enclosure_id))
		const currentLineageIds = new Set(enclosureSourceIds)
		const lineageChanged =
			originalLineageIds.size !== currentLineageIds.size ||
			[...originalLineageIds].some((id) => !currentLineageIds.has(id))
		const hasChanges =
			(count ?? 0) !== (enclosure?.current_count ?? 0) ||
			!locationUnchanged ||
			isActive !== (enclosure?.is_active ?? true) ||
			lifeStage !== (enclosure?.life_stage ?? '') ||
			specimenTrackingId.trim() !== (enclosure?.institutional_specimen_id ?? '') ||
			resolvedExternalSource !== (enclosure?.institutional_external_source ?? '') ||
			lineageChanged

		if (!hasChanges) {
			toast.info('No changes to save!')
			return
		}

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

		editEnclosureMutation.mutate(
			{
				orgId: orgId as UUID,
				enclosure_id: enclosure.id,
				location_id: resolvedLocationId,
				count: count ?? 0,
				is_active: isActive,
				life_stage: lifeStage,
				institutional_specimen_id: specimenTrackingId.trim(),
				institutional_external_source: resolvedExternalSource,
				source_enclosure_ids: enclosureSourceIds
			},
			{
				onSuccess: () => {
					handleOpenChange(false)
				}
			}
		)
	}

	return (
		<ResponsiveDialogDrawer
			title={`Edit Enclosure: ${enclosure?.name}`}
			description='All fields are required. Leave value to keep current.'
			open={open}
			onOpenChange={handleOpenChange}
			trigger={
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<span className='w-full'>
								<Button
									className='w-full'
									variant='secondary'
									onClick={() => handleOpenChange(true)}
									disabled={!enclosure?.is_active}
								>
									<Edit2Icon className='w-4 h-4' /> Edit Enclosure
								</Button>
							</span>
						</TooltipTrigger>
						{!enclosure?.is_active ? (
							<TooltipContent>
								<p>Cannot edit inactive enclosures.</p>
							</TooltipContent>
						) : null}
					</Tooltip>
				</TooltipProvider>
			}
		>
			<form onSubmit={handleSubmit} className='flex flex-col gap-4'>
				<div className='grid grid-cols-1 gap-4'>
					<div className='flex items-center justify-between'>
						<Label>Enclosure Location</Label>
						<div className='flex items-center rounded-md border text-xs overflow-hidden w-34'>
							<button
								type='button'
								className={`w-full text-center px-2.5 py-1 transition-colors ${!createLocation ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-background'}`}
								onClick={() => {
									setCreateLocation(false)
									const restored = savedLocationRef.current
									setLocation(restored)
									setLocationQuery(restored ?? '')
								}}
							>
								Search
							</button>
							<button
								type='button'
								className={`w-full text-center px-2.5 py-1 transition-colors ${createLocation ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-background'}`}
								onClick={() => {
									savedLocationRef.current = location
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
							value={location ?? ''}
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
								placeholder={location || 'Search locations...'}
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
								id='count'
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
					<Label>Specimen Tracking ID (Optional)</Label>
					<Combobox
						items={filteredSpecimenIds}
						filter={() => true}
						value={specimenTrackingId}
						onValueChange={(value) => setSpecimenTrackingId(value ?? '')}
					>
						<ComboboxInput
							className='h-9'
							placeholder='Enter specimen tracking ID...'
							value={specimenTrackingId}
							onChange={(event) => setSpecimenTrackingId(event.target.value)}
							disabled={isPending}
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
					<div className='flex items-center justify-between'>
						<Label>Sources (Optional)</Label>
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
								placeholder='Institution or external source...'
								value={externalSource}
								onChange={(e) => setExternalSource(e.target.value)}
								disabled={isPending}
								onKeyDown={(e) => {
									if (e.key === 'Enter' && externalSource.trim()) {
										e.preventDefault()
										if (!sources.some((s) => s.type === 'institution' && s.value === externalSource.trim())) {
											setSources((prev) => [
												...prev,
												{ type: 'institution', value: externalSource.trim(), label: externalSource.trim() }
											])
										}
										setExternalSource('')
									}
								}}
							/>
							<Button
								type='button'
								size='sm'
								variant='secondary'
								className='h-9 px-3'
								disabled={!externalSource.trim() || isPending}
								onClick={() => {
									if (!sources.some((s) => s.type === 'institution' && s.value === externalSource.trim())) {
										setSources((prev) => [
											...prev,
											{ type: 'institution', value: externalSource.trim(), label: externalSource.trim() }
										])
									}
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
								placeholder='Search source enclosure...'
								value={sourceEnclosureQuery}
								onChange={(event) => setSourceEnclosureQuery(event.target.value)}
								disabled={isPending}
								showClear
							/>
							<ComboboxContent>
								<ComboboxEmpty>No matching enclosures for this species.</ComboboxEmpty>
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
				<div className='flex flex-col gap-3'>
					<Button type='submit' disabled={isPending || !user}>
						{isPending ? <LoaderCircle className='animate-spin' /> : 'Confirm'}
					</Button>
					<Button type='button' variant='outline' disabled={isPending} onClick={() => handleOpenChange(false)}>
						Cancel
					</Button>
				</div>
			</form>
		</ResponsiveDialogDrawer>
	)
}
