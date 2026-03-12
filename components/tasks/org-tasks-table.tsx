'use client'

import { useParams } from 'next/navigation'
import { UUID } from 'crypto'
import { useMemo, useState } from 'react'
import { PlusIcon } from 'lucide-react'

import { TasksDataTable } from './tasks-table'
import { Button } from '../ui/button'
import { ResponsiveDialogDrawer } from '../ui/dialog-to-drawer'
import { Label } from '../ui/label'
import { useOrgEnclosures } from '@/lib/react-query/queries'
import {
	Combobox,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList
} from '../ui/combobox'
import { CreateTaskButton } from './create-task-button'

export default function OrgTasksTable() {
	const params = useParams()
	const orgId = params?.orgId as UUID

	const [open, setOpen] = useState(false)
	const [enclosure, setEnclosure] = useState('')
	const [enclosureQuery, setEnclosureQuery] = useState('')

	const { data: orgEnclosures } = useOrgEnclosures(orgId)

	const scoreMatch = (str: string | undefined, val: string): number => {
		if (!str) return -1
		const s = str.trim().toLowerCase()
		if (s === val) return 0
		if (s.startsWith(val)) return 1
		if (s.includes(val)) return 2
		return -1
	}

	const filteredEnclosures = useMemo(() => {
		if (!enclosureQuery.trim()) return orgEnclosures ?? []
		const val = enclosureQuery.trim().toLowerCase()
		return (orgEnclosures ?? [])
			.map((enc) => ({ enc, score: scoreMatch(enc.name, val) }))
			.filter(({ score }) => score >= 0)
			.sort((a, b) => a.score - b.score)
			.map(({ enc }) => enc)
	}, [enclosureQuery, orgEnclosures])

	const selectedEnclosure = orgEnclosures?.find((e) => e.name === enclosure)

	const handleClose = () => {
		setOpen(false)
		setEnclosure('')
		setEnclosureQuery('')
	}

	return (
		<TasksDataTable
			orgId={orgId}
			orgEnclosures
			createTaskButton={
				<ResponsiveDialogDrawer
					title='Create Task'
					description='Select an enclosure to continue'
					trigger={
						<Button onClick={() => setOpen(true)} className='w-full'>
							<PlusIcon className='h-4 w-4' />
							Create Task
						</Button>
					}
					open={open}
					onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleClose())}
				>
					<div className='grid gap-4 py-2 px-4'>
						<div className='grid gap-2'>
							<Label>Enclosure</Label>
							<Combobox
								items={filteredEnclosures}
								filter={() => true}
								value={enclosure}
								onValueChange={(value) => {
									setEnclosure(value ?? '')
									setEnclosureQuery(value ?? '')
								}}
							>
								<ComboboxInput
									className='h-9'
									placeholder='Search enclosures...'
									value={enclosureQuery}
									onChange={(e) => setEnclosureQuery(e.target.value)}
									showClear
								/>
								<ComboboxContent>
									<ComboboxEmpty>No matching enclosures.</ComboboxEmpty>
									<ComboboxList className='max-h-42 scrollbar-no-track'>
										<ComboboxCollection>
											{(enc) => (
												<ComboboxItem key={enc.id} value={enc.name}>
													{enc.name}
												</ComboboxItem>
											)}
										</ComboboxCollection>
									</ComboboxList>
								</ComboboxContent>
							</Combobox>
						</div>

						{/* TODO: render task creation form here using selectedEnclosure?.id */}
					</div>

					<div className='flex flex-col gap-2 px-4 pb-2'>
						<CreateTaskButton enclosureId={selectedEnclosure?.id as UUID} orgId={orgId} disabled={!selectedEnclosure} />
						<Button type='button' variant='outline' onClick={handleClose}>
							Cancel
						</Button>
					</div>
				</ResponsiveDialogDrawer>
			}
		/>
	)
}
