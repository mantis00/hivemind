'use client'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoaderCircle, Edit2Icon } from 'lucide-react'
import { useState } from 'react'
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

export function EditEnclosureButton({ enclosure, spec }: { enclosure: Enclosure; spec: OrgSpecies }) {
	const [open, setOpen] = useState(false)
	const [name, setName] = useState(enclosure?.name)
	const [species, setSpecies] = useState(spec?.custom_common_name)
	const [speciesQuery, setSpeciesQuery] = useState(species ?? '')
	const [location, setLocation] = useState(enclosure.locations?.name)
	const [locationQuery, setLocationQuery] = useState(location ?? '')
	const [count, setCount] = useState(enclosure?.current_count)
	const { data: user } = useCurrentClientUser()
	const editEnclosureMutation = useUpdateEnclosure()
	const params = useParams()
	const orgId = params?.orgId as number | undefined

	const { data: orgSpecies } = useSpecies(orgId as number)
	const { data: orgLocations } = useOrgLocations(orgId as number)

	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen) {
			// Reset form state from latest props when dialog opens
			setName(enclosure?.name)
			setSpecies(spec?.custom_common_name)
			setSpeciesQuery(spec?.custom_common_name ?? '')
			setLocation(enclosure.locations?.name)
			setLocationQuery(enclosure.locations?.name ?? '')
			setCount(enclosure?.current_count)
		}
		setOpen(isOpen)
	}

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
		editEnclosureMutation.mutate(
			{
				orgId: orgId as number,
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
				<div className='grid py-4'>
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
						<Label>Species</Label>
						<Combobox
							items={orgSpecies ?? []}
							value={species}
							onValueChange={(value) => {
								setSpecies(value ?? '')
								if (value) setSpeciesQuery(value)
								console.log(species)
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
							{speciesQuery.trim().length > 0 && (
								<ComboboxContent>
									<ComboboxEmpty>No matching species.</ComboboxEmpty>
									<ComboboxList>
										<ComboboxCollection>
											{(spec) => (
												<ComboboxItem key={spec.id} value={spec.common_name}>
													{spec.common_name}
												</ComboboxItem>
											)}
										</ComboboxCollection>
									</ComboboxList>
								</ComboboxContent>
							)}
						</Combobox>
						<Label>Enclosure Location</Label>
						<Combobox
							items={orgLocations ?? []}
							value={location}
							onValueChange={(value) => {
								setLocation(value ?? '')
								if (value) setLocationQuery(value)
								console.log(location)
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
							{locationQuery.trim().length > 0 && (
								<ComboboxContent>
									<ComboboxEmpty>No matching locations.</ComboboxEmpty>
									<ComboboxList>
										<ComboboxCollection>
											{(loc) => (
												<ComboboxItem key={loc.id} value={loc.name}>
													{loc.name}
												</ComboboxItem>
											)}
										</ComboboxCollection>
									</ComboboxList>
								</ComboboxContent>
							)}
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
				<div className='flex flex-row gap-3 justify-center'>
					<Button
						type='button'
						variant='outline'
						disabled={editEnclosureMutation.isPending}
						onClick={() => setOpen(false)}
					>
						Cancel
					</Button>
					<Button type='submit' disabled={editEnclosureMutation.isPending || !user}>
						{editEnclosureMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Confirm'}
					</Button>
				</div>
			</form>
		</ResponsiveDialogDrawer>
	)
}
