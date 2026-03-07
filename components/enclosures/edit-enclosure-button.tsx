'use client'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoaderCircle, Edit2Icon } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useUpdateEnclosure } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { Enclosure, OrgSpecies, useOrgLocations, useSpecies } from '@/lib/react-query/queries'
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
import { toast } from 'sonner'

export function EditEnclosureButton({ enclosure, spec }: { enclosure: Enclosure; spec: OrgSpecies }) {
	const [open, setOpen] = useState(false)
	const [name, setName] = useState(enclosure?.name)
	const [species, setSpecies] = useState(spec?.custom_common_name)
	const [speciesQuery, setSpeciesQuery] = useState(species ?? '')
	const [showScientific, setShowScientific] = useState(false)
	const [location, setLocation] = useState(enclosure.locations?.name)
	const [locationQuery, setLocationQuery] = useState(location ?? '')
	const [count, setCount] = useState(enclosure?.current_count)
	const { data: user } = useCurrentClientUser()
	const editEnclosureMutation = useUpdateEnclosure()
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined

	const { data: orgSpecies } = useSpecies(orgId as UUID)
	const { data: orgLocations } = useOrgLocations(orgId as UUID)

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
			.map((s) => {
				const field = showScientific ? s.species?.scientific_name : s.custom_common_name
				return { s, score: scoreMatch(field, val) }
			})
			.filter(({ score }) => score >= 0)
			.sort((a, b) => a.score - b.score)
			.map(({ s }) => s)
	}, [speciesQuery, orgSpecies, showScientific])

	const filteredLocations = useMemo(() => {
		if (!locationQuery.trim()) return orgLocations ?? []
		const val = locationQuery.trim().toLowerCase()
		return (orgLocations ?? [])
			.map((loc) => ({ loc, score: scoreMatch(loc.name, val) }))
			.filter(({ score }) => score >= 0)
			.sort((a, b) => a.score - b.score)
			.map(({ loc }) => loc)
	}, [locationQuery, orgLocations])

	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen) {
			// Reset form state from latest props when dialog opens
			setName(enclosure?.name)
			setSpecies(spec?.custom_common_name)
			setSpeciesQuery(spec?.custom_common_name ?? '')
			setShowScientific(false)
			setLocation(enclosure.locations?.name)
			setLocationQuery(enclosure.locations?.name ?? '')
			setCount(enclosure?.current_count)
		}
		setOpen(isOpen)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!name || !species || !location) return

		const species_id = orgSpecies?.find((spec) => spec?.custom_common_name === species)
		const location_id = orgLocations?.find((loc) => loc?.name === location)

		if (!species_id || !location_id) {
			return
		}

		if (
			name === enclosure?.name &&
			species_id.custom_common_name === species &&
			location_id.name === location &&
			enclosure.current_count === count
		) {
			toast.info('No changes to save.')
			return
		}

		editEnclosureMutation.mutate(
			{
				orgId: orgId as UUID,
				enclosure_id: enclosure.id,
				name: name === '' ? enclosure.name : name,
				species_id: species_id.id,
				location_id: location_id.id,
				count: count
			},
			{
				onSuccess: () => {
					setOpen(false)
					setName('')
					setSpecies('')
					setSpeciesQuery('')
					setLocation('')
					setLocationQuery('')
					setCount(0)
				}
			}
		)
	}

	return (
		<ResponsiveDialogDrawer
			title='Edit Enclosure'
			description='All fields are required'
			open={open}
			onOpenChange={handleOpenChange}
			trigger={
				<Button variant='secondary' onClick={() => setOpen(true)}>
					<Edit2Icon className='w-4 h-4' /> Edit Enclosure
				</Button>
			}
		>
			<form onSubmit={handleSubmit}>
				<div className='grid py-4 px-4'>
					<div className='grid grid-cols-1 gap-4'>
						<Label>Enclosure Name</Label>
						<Input
							id='name'
							className='h-9'
							placeholder='Enclosure Name'
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							disabled={editEnclosureMutation.isPending}
						/>
						<div className='flex items-center justify-between'>
							<Label>Species</Label>
							<div className='flex items-center rounded-md border text-xs overflow-hidden'>
								<button
									type='button'
									className={`px-2.5 py-1 transition-colors ${!showScientific ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-background'}`}
									onClick={() => {
										setShowScientific(false)
										setSpecies('')
										setSpeciesQuery('')
									}}
								>
									Common
								</button>
								<button
									type='button'
									className={`px-2.5 py-1 transition-colors ${showScientific ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-background'}`}
									onClick={() => {
										setShowScientific(true)
										setSpecies('')
										setSpeciesQuery('')
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
								if (value) setSpeciesQuery(value)
							}}
						>
							<ComboboxInput
								className='h-9'
								placeholder={species}
								value={speciesQuery}
								onChange={(event) => setSpeciesQuery(event.target.value)}
								disabled={editEnclosureMutation.isPending}
								showClear
							/>
							<ComboboxContent>
								<ComboboxEmpty>No matching species.</ComboboxEmpty>
								<ComboboxList className='max-h-42 scrollbar-no-track'>
									<ComboboxCollection>
										{(spec) => (
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
						<Label>Enclosure Location</Label>
						<Combobox
							items={filteredLocations}
							filter={() => true}
							value={location}
							onValueChange={(value) => {
								setLocation(value ?? '')
								if (value) setLocationQuery(value)
							}}
						>
							<ComboboxInput
								className='h-9'
								placeholder={location}
								value={locationQuery}
								onChange={(event) => setLocationQuery(event.target.value)}
								disabled={editEnclosureMutation.isPending}
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
						<Label>Count</Label>
						<Input
							className='h-9'
							id='count'
							placeholder='Count'
							value={count}
							type='number'
							min='0'
							onChange={(e) => setCount(Number(e.target.value))}
							required
							disabled={editEnclosureMutation.isPending}
						/>
					</div>
				</div>
				<div className='flex flex-col gap-3 justify-center px-4 pb-2'>
					<Button type='submit' disabled={editEnclosureMutation.isPending || !user}>
						{editEnclosureMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Confirm'}
					</Button>
					<Button
						type='button'
						variant='outline'
						disabled={editEnclosureMutation.isPending}
						onClick={() => setOpen(false)}
					>
						Cancel
					</Button>
				</div>
			</form>
		</ResponsiveDialogDrawer>
	)
}
