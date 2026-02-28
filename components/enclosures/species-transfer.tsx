'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeftIcon, ChevronRightIcon, SaveAllIcon, SaveIcon, SquareCheckIcon, SquareIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAllSpecies, useOrgSpecies } from '@/lib/react-query/queries'
import { useParams } from 'next/navigation'
import { UUID } from 'crypto'
import RequestNewSpeciesButton from './request-new-species-button'

type Item = {
	key: string
	label: string
	selected?: boolean
}

export default function SpeciesTransferList() {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const { data: species } = useOrgSpecies(orgId as UUID)
	const { data: master_species } = useAllSpecies()

	const [leftList, setLeftList] = useState<Item[]>([])
	const [rightList, setRightList] = useState<Item[]>([])
	const [leftSearch, setLeftSearch] = useState('')
	const [rightSearch, setRightSearch] = useState('')

	useEffect(() => {
		if (species) {
			setLeftList(
				species.map((s) => ({
					key: s.id,
					label: s.custom_common_name || s.species.scientific_name
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
						label: s.common_name || s.scientific_name
					}))
			)
		}
	}, [species, master_species])

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

	return (
		<div className='flex flex-col p-2 gap-2'>
			<RequestNewSpeciesButton />
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
							variant='outline'
						>
							<ChevronRightIcon className='h-4 w-4' />
						</Button>
					</div>
					<ul className='h-65 border-l border-r border-b rounded-br-sm rounded-bl-sm p-2 overflow-y-scroll'>
						{leftList
							.filter((item) => item.label.toLowerCase().includes(leftSearch.toLowerCase()))
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
										<span className='break-words text-left'>{item.label}</span>
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
							variant='outline'
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
					<ul className='h-65 border-l border-r border-b rounded-br-sm rounded-bl-sm p-1.5 overflow-y-scroll'>
						{rightList
							.filter((item) => item.label.toLowerCase().includes(rightSearch.toLowerCase()))
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
										<span className='wrap-break-words text-left'>{item.label}</span>
									</button>
								</li>
							))}
					</ul>
				</div>
				<div></div>
			</div>
			<Button size='default' variant='secondary'>
				Save <SaveIcon className='w-4 h-4' />
			</Button>
			<Button>Cancel</Button>
		</div>
	)
}
