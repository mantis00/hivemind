'use client'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlusIcon, LoaderCircle } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useCreateEnclosure } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { OrgSpecies, useOrgLocations, useOrgSpecies } from '@/lib/react-query/queries'
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

export function CreateEnclosureButton() {
	const [open, setOpen] = useState(false)
	const [name, setName] = useState('')
	const [species, setSpecies] = useState('')
	const [speciesQuery, setSpeciesQuery] = useState('')
	const [showScientific, setShowScientific] = useState(false)
	const [location, setLocation] = useState('')
	const [locationQuery, setLocationQuery] = useState('')
	const [count, setCount] = useState('')
	const { data: user } = useCurrentClientUser()
	const createEnclosureMutation = useCreateEnclosure()
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined

	const { data: orgSpecies } = useOrgSpecies(orgId as UUID)
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		console.log(species)
		if (!name || !species || !location) return

		const species_id = orgSpecies?.find((spec) => spec?.custom_common_name === species)
		const location_id = orgLocations?.find((loc) => loc?.name === location)

		if (!species_id || !location_id) {
			console.log('ERROR LOOKING UP SPECIES OR LOCATION')
			return
		}
		createEnclosureMutation.mutate(
			{
				orgId: orgId as UUID,
				species_id: species_id?.id as UUID,
				name: name,
				location: location_id?.id as UUID,
				current_count: count ? parseInt(count, 10) : 0
			},
			{
				onSuccess: () => {
					setOpen(false)
					setName('')
					setSpecies('')
					setSpeciesQuery('')
					setLocation('')
					setLocationQuery('')
					setCount('')
				}
			}
		)
	}

	return (
		<ResponsiveDialogDrawer
			title='Create Enclosure'
			description='All fields are required'
			open={open}
			onOpenChange={(isOpen) => setOpen(isOpen)}
			trigger={
				<Button onClick={() => setOpen(true)} size='default'>
					Add Enclosure <PlusIcon className='w-4 h-4' />
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
							disabled={createEnclosureMutation.isPending}
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
								setSpeciesQuery(value ?? '')
							}}
						>
							<ComboboxInput
								className='h-9'
								placeholder='Search species...'
								value={speciesQuery}
								onChange={(event) => setSpeciesQuery(event.target.value)}
								disabled={createEnclosureMutation.isPending}
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
						<Label>Enclosure Location</Label>
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
								disabled={createEnclosureMutation.isPending}
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
							onChange={(e) => setCount(e.target.value)}
							required
							disabled={createEnclosureMutation.isPending}
						/>
					</div>
				</div>
				<div className='flex flex-col gap-3 justify-center px-4 pb-2'>
					<Button type='submit' disabled={createEnclosureMutation.isPending || !user}>
						{createEnclosureMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Create Enclosure'}
					</Button>
					<Button
						type='button'
						variant='outline'
						size='default'
						disabled={createEnclosureMutation.isPending}
						onClick={() => setOpen(false)}
					>
						Cancel
					</Button>
				</div>
			</form>
		</ResponsiveDialogDrawer>
	)
}
