'use client'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlusIcon, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useCreateEnclosure } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { OrgSpecies, useOrgLocations, useSpecies } from '@/lib/react-query/queries'
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
import { useIsMobile } from '@/hooks/use-mobile'

export function CreateEnclosureButton() {
	const [open, setOpen] = useState(false)
	const [name, setName] = useState('')
	const [species, setSpecies] = useState('')
	const [speciesQuery, setSpeciesQuery] = useState('')
	const [location, setLocation] = useState('')
	const [locationQuery, setLocationQuery] = useState('')
	const [count, setCount] = useState('')
	const { data: user } = useCurrentClientUser()
	const createEnclosureMutation = useCreateEnclosure()
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined

	const { data: orgSpecies } = useSpecies(orgId as UUID)
	const { data: orgLocations } = useOrgLocations(orgId as UUID)

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
				<Button variant='secondary' onClick={() => setOpen(true)}>
					Create {useIsMobile() ? '' : 'Enclosure'} <PlusIcon className='w-4 h-4' />
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
							disabled={createEnclosureMutation.isPending}
						/>
						<Label>Species</Label>
						<Combobox
							items={orgSpecies ?? []}
							value={species}
							onValueChange={(value) => {
								const nextValue = value ?? ''
								setSpecies(nextValue)
								setSpeciesQuery(nextValue)
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
							{speciesQuery.trim().length > 0 && (
								<ComboboxContent>
									<ComboboxEmpty>No matching species.</ComboboxEmpty>
									<ComboboxList>
										<ComboboxCollection>
											{(spec: OrgSpecies) => (
												<ComboboxItem key={spec.id} value={spec.custom_common_name}>
													{spec.custom_common_name}
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
								const nextValue = value ?? ''
								setLocation(nextValue)
								setLocationQuery(nextValue)
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
							onChange={(e) => setCount(e.target.value)}
							required
							disabled={createEnclosureMutation.isPending}
						/>
					</div>
				</div>
				<div className='flex flex-row gap-3 justify-center'>
					<Button
						type='button'
						variant='outline'
						disabled={createEnclosureMutation.isPending}
						onClick={() => setOpen(false)}
					>
						Cancel
					</Button>
					<Button type='submit' disabled={createEnclosureMutation.isPending || !user}>
						{createEnclosureMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Create Enclosure'}
					</Button>
				</div>
			</form>
		</ResponsiveDialogDrawer>
	)
}
