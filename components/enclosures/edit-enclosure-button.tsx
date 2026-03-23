'use client'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoaderCircle, Edit2Icon } from 'lucide-react'
import { useState, useMemo, useRef } from 'react'
import { useUpdateEnclosure, useCreateLocation } from '@/lib/react-query/mutations'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { UUID } from 'crypto'
import { toast } from 'sonner'

export function EditEnclosureButton({ enclosure, spec }: { enclosure: Enclosure; spec: OrgSpecies }) {
	const [open, setOpen] = useState(false)
	const [species, setSpecies] = useState(spec?.custom_common_name)
	const [location, setLocation] = useState(enclosure.locations?.name)
	const [locationQuery, setLocationQuery] = useState(location ?? '')
	const [createLocation, setCreateLocation] = useState(false)
	const savedLocationRef = useRef<string | undefined>(undefined)
	const [count, setCount] = useState(enclosure?.current_count)
	const [isActive, setIsActive] = useState(enclosure?.is_active ?? true)
	const { data: user } = useCurrentClientUser()
	const editEnclosureMutation = useUpdateEnclosure()
	const createLocationMutation = useCreateLocation()
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
			setSpecies(spec?.custom_common_name)
			setLocation(enclosure.locations?.name)
			setLocationQuery(enclosure.locations?.name ?? '')
			setCreateLocation(false)
			savedLocationRef.current = undefined
			setCount(enclosure?.current_count)
			setIsActive(enclosure?.is_active ?? true)
		}
		setOpen(isOpen)
	}

	const isPending = editEnclosureMutation.isPending || createLocationMutation.isPending

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!species || !location) return

		const species_id = orgSpecies?.find((spec) => spec?.custom_common_name === species)
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

			if (
				species_id.custom_common_name === species &&
				existing.name === location &&
				enclosure.current_count === count &&
				enclosure.is_active === isActive
			) {
				toast.info('No changes to save.')
				return
			}
		}

		editEnclosureMutation.mutate(
			{
				orgId: orgId as UUID,
				enclosure_id: enclosure.id,
				species_id: species_id.id,
				location_id: resolvedLocationId,
				count: count,
				is_active: isActive
			},
			{
				onSuccess: () => {
					setOpen(false)
					setSpecies('')
					setCreateLocation(false)
					setLocation('')
					setLocationQuery('')
					setCount(0)
					setIsActive(true)
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
									onClick={() => setOpen(true)}
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
						disabled={isPending}
					/>
				</div>
				<div className='flex flex-col gap-3'>
					<Button type='submit' disabled={isPending || !user}>
						{isPending ? <LoaderCircle className='animate-spin' /> : 'Confirm'}
					</Button>
					<Button type='button' variant='outline' disabled={isPending} onClick={() => setOpen(false)}>
						Cancel
					</Button>
				</div>
			</form>
		</ResponsiveDialogDrawer>
	)
}
