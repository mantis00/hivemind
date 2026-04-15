'use client'

import { useParams } from 'next/navigation'
import { UUID } from 'crypto'
import { useMemo, useState } from 'react'
import { PlusIcon, ArrowLeft, Layers, LayoutList, ChevronDown } from 'lucide-react'
import { TasksDataTable } from './tasks-table'
import { Button } from '../ui/button'
import { ResponsiveDialogDrawer } from '../ui/dialog-to-drawer'
import { useOrgEnclosures, useOrgSpecies, useOrgEnclosuresForSpecies } from '@/lib/react-query/queries'
import { CreateTaskButton } from './create-task-button'
import { VirtualizedCommand, type VirtualizedOption } from '../ui/virtualized-combobox'

type CreateStep = 'mode' | 'single' | 'batch'

export default function OrgTasksTable() {
	const params = useParams()
	const orgId = params?.orgId as UUID

	const [open, setOpen] = useState(false)
	const [step, setStep] = useState<CreateStep>('mode')

	// Single mode state
	const [enclosure, setEnclosure] = useState('')
	const [singleEnclosureOpen, setSingleEnclosureOpen] = useState(false)

	// Batch mode state
	const [selectedSpeciesId, setSelectedSpeciesId] = useState<UUID | ''>('')
	const [selectedEnclosureIds, setSelectedEnclosureIds] = useState<UUID[]>([])
	const [speciesOpen, setSpeciesOpen] = useState(false)
	const [enclosureOpen, setEnclosureOpen] = useState(false)

	const { data: orgEnclosures } = useOrgEnclosures(orgId)
	const { data: orgSpecies } = useOrgSpecies(orgId)
	const { data: speciesEnclosures } = useOrgEnclosuresForSpecies(orgId, selectedSpeciesId as UUID)

	// Species options for VirtualizedCommand
	const speciesOptions = useMemo<VirtualizedOption[]>(
		() =>
			(orgSpecies ?? []).map((s) => ({
				value: s.id,
				label: s.custom_common_name,
				subLabel: s.species?.scientific_name
			})),
		[orgSpecies]
	)

	// Enclosure options for single VirtualizedCommand
	const singleEnclosureOptions = useMemo<VirtualizedOption[]>(
		() => (orgEnclosures ?? []).map((e) => ({ value: e.name, label: e.name })),
		[orgEnclosures]
	)

	// Enclosure options for batch VirtualizedCommand
	const batchEnclosureOptions = useMemo<VirtualizedOption[]>(
		() => (speciesEnclosures ?? []).map((e) => ({ value: e.id, label: e.name })),
		[speciesEnclosures]
	)

	const selectedEnclosure = orgEnclosures?.find((e) => e.name === enclosure)
	const selectedSpecies = orgSpecies?.find((s) => s.id === selectedSpeciesId)

	const handleClose = () => {
		setOpen(false)
		setStep('mode')
		setEnclosure('')
		setSingleEnclosureOpen(false)
		setSelectedSpeciesId('')
		setSelectedEnclosureIds([])
		setSpeciesOpen(false)
		setEnclosureOpen(false)
	}

	const handleSpeciesSelect = (value: string) => {
		setSelectedSpeciesId(value as UUID)
		setSelectedEnclosureIds([])
		setSpeciesOpen(false)
		setEnclosureOpen(false)
	}

	const handleEnclosureToggle = (value: string) => {
		setSelectedEnclosureIds((prev) =>
			prev.includes(value as UUID) ? prev.filter((id) => id !== value) : [...prev, value as UUID]
		)
	}

	const titleMap: Record<CreateStep, string> = {
		mode: 'Create Task',
		single: 'Create Task',
		batch: 'Batch Create Tasks'
	}

	const descriptionMap: Record<CreateStep, string> = {
		mode: 'Choose how to create your task',
		single: 'Select an enclosure to continue',
		batch: 'Select a species and enclosures'
	}

	return (
		<TasksDataTable
			orgId={orgId}
			orgEnclosures
			createTaskButton={
				<ResponsiveDialogDrawer
					title={titleMap[step]}
					description={descriptionMap[step]}
					trigger={
						<Button onClick={() => setOpen(true)} className='w-full'>
							<PlusIcon className='h-4 w-4' />
							Create Task
						</Button>
					}
					open={open}
					onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleClose())}
				>
					{/* ── Step: mode ── */}
					{step === 'mode' && (
						<div className='grid gap-3'>
							<button
								className='flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
								onClick={() => setStep('single')}
							>
								<LayoutList className='mt-0.5 h-5 w-5 shrink-0 text-muted-foreground' />
								<div>
									<p className='text-sm font-medium'>Single Enclosure</p>
									<p className='text-xs text-muted-foreground'>Create a task for one specific enclosure</p>
								</div>
							</button>
							<button
								className='flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
								onClick={() => setStep('batch')}
							>
								<Layers className='mt-0.5 h-5 w-5 shrink-0 text-muted-foreground' />
								<div>
									<p className='text-sm font-medium'>Batch Create</p>
									<p className='text-xs text-muted-foreground'>
										Create the same task across multiple enclosures at once
									</p>
								</div>
							</button>
						</div>
					)}

					{/* ── Step: single ── */}
					{step === 'single' && (
						<div className='grid gap-4'>
							<Button
								variant='ghost'
								size='sm'
								className='-mt-1 -ml-2 w-fit gap-1.5 text-muted-foreground'
								onClick={() => setStep('mode')}
							>
								<ArrowLeft className='h-3.5 w-3.5' />
								Back
							</Button>
							<div className='space-y-3'>
								<p className='text-sm font-medium text-muted-foreground'>Enclosure</p>
								<Button
									type='button'
									variant='outline'
									className='w-full gap-2 justify-between'
									onClick={() => setSingleEnclosureOpen((prev) => !prev)}
								>
									{enclosure || 'Select an enclosure…'}
									<ChevronDown className={`h-4 w-4 transition-transform ${singleEnclosureOpen ? 'rotate-180' : ''}`} />
								</Button>
								{singleEnclosureOpen && (
									<div className='rounded-md border p-0 **:data-[slot=command-input]:text-base **:data-[slot=command-input]:md:text-sm'>
										<div className='**:data-[slot=command-group]:p-0 **:data-[slot=command-item]:pl-3 **:data-[slot=command-item]:pr-2 **:data-[slot=command-item]:cursor-pointer'>
											<VirtualizedCommand
												height='240px'
												options={singleEnclosureOptions}
												placeholder='Search enclosures...'
												selectedOption={enclosure}
												emptyMessage='No enclosures found.'
												onSelectOption={(value) => {
													setEnclosure(value)
													setSingleEnclosureOpen(false)
												}}
											/>
										</div>
									</div>
								)}
							</div>
							<div className='flex flex-col gap-2'>
								<CreateTaskButton
									enclosureId={selectedEnclosure?.id as UUID}
									orgId={orgId}
									disabled={!selectedEnclosure}
									onTaskCreated={handleClose}
								/>
								<Button type='button' variant='outline' onClick={handleClose}>
									Cancel
								</Button>
							</div>
						</div>
					)}

					{/* ── Step: batch ── */}
					{step === 'batch' && (
						<div className='grid gap-4'>
							<Button
								variant='ghost'
								size='sm'
								className='-mt-1 -ml-2 w-fit gap-1.5 text-muted-foreground'
								onClick={() => {
									setStep('mode')
									setSelectedSpeciesId('')
									setSelectedEnclosureIds([])
								}}
							>
								<ArrowLeft className='h-3.5 w-3.5' />
								Back
							</Button>

							{/* Species picker */}
							<div className='space-y-3'>
								<p className='text-sm font-medium text-muted-foreground'>
									Species {selectedSpeciesId && `— ${selectedSpecies?.custom_common_name}`}
								</p>
								<Button
									type='button'
									variant='outline'
									className='w-full gap-2 justify-between'
									onClick={() => {
										const next = !speciesOpen
										setSpeciesOpen(next)
										if (next) setEnclosureOpen(false)
									}}
								>
									{selectedSpecies ? selectedSpecies.custom_common_name : 'Select a species…'}
									<ChevronDown className={`h-4 w-4 transition-transform ${speciesOpen ? 'rotate-180' : ''}`} />
								</Button>
								{speciesOpen && (
									<div className='rounded-md border p-0 **:data-[slot=command-input]:text-base **:data-[slot=command-input]:md:text-sm'>
										<div className='**:data-[slot=command-group]:p-0 **:data-[slot=command-item]:pl-3 **:data-[slot=command-item]:pr-2 **:data-[slot=command-item]:cursor-pointer'>
											<VirtualizedCommand
												height='240px'
												options={speciesOptions}
												placeholder='Search species...'
												selectedOption={selectedSpeciesId}
												emptyMessage='No species found.'
												onSelectOption={handleSpeciesSelect}
											/>
										</div>
									</div>
								)}
							</div>

							{/* Enclosure multi-select (only after species chosen) */}
							{selectedSpeciesId && (
								<div className='space-y-3'>
									<div className='flex items-center justify-between'>
										<p className='text-sm font-medium text-muted-foreground'>
											Enclosures {selectedEnclosureIds.length > 0 && `(${selectedEnclosureIds.length})`}
										</p>
										{batchEnclosureOptions.length > 0 && (
											<Button
												variant='ghost'
												size='sm'
												className='h-6 text-xs px-2'
												onClick={
													selectedEnclosureIds.length === batchEnclosureOptions.length
														? () => setSelectedEnclosureIds([])
														: () => setSelectedEnclosureIds(batchEnclosureOptions.map((e) => e.value as UUID))
												}
											>
												{selectedEnclosureIds.length === batchEnclosureOptions.length ? 'Deselect All' : 'Select All'}
											</Button>
										)}
									</div>
									<Button
										type='button'
										variant='outline'
										className='w-full gap-2 justify-between'
										onClick={() => {
											const next = !enclosureOpen
											setEnclosureOpen(next)
											if (next) setSpeciesOpen(false)
										}}
									>
										{selectedEnclosureIds.length === 0
											? 'Select enclosures…'
											: selectedEnclosureIds.length === batchEnclosureOptions.length
												? 'All enclosures selected'
												: `${selectedEnclosureIds.length} enclosure${
														selectedEnclosureIds.length === 1 ? '' : 's'
													} selected`}
										<ChevronDown className={`h-4 w-4 transition-transform ${enclosureOpen ? 'rotate-180' : ''}`} />
									</Button>
									{enclosureOpen && (
										<div className='rounded-md border p-0 **:data-[slot=command-input]:text-base **:data-[slot=command-input]:md:text-sm'>
											<div className='**:data-[slot=command-group]:p-0 **:data-[slot=command-item]:pl-3 **:data-[slot=command-item]:pr-2 **:data-[slot=command-item]:cursor-pointer'>
												<VirtualizedCommand
													height='240px'
													options={batchEnclosureOptions}
													placeholder='Search enclosures...'
													selectedOptions={selectedEnclosureIds}
													emptyMessage='No enclosures found.'
													onSelectOption={handleEnclosureToggle}
												/>
											</div>
										</div>
									)}
								</div>
							)}

							{/* Create button */}
							<div className='flex flex-col gap-2'>
								<CreateTaskButton
									enclosureId={selectedEnclosureIds[0] as UUID}
									batchEnclosureIds={selectedEnclosureIds as UUID[]}
									orgId={orgId}
									disabled={selectedEnclosureIds.length === 0}
									onTaskCreated={handleClose}
								/>
								<Button type='button' variant='outline' onClick={handleClose}>
									Cancel
								</Button>
							</div>
						</div>
					)}
				</ResponsiveDialogDrawer>
			}
		/>
	)
}
