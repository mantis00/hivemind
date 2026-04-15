'use client'
import { useState } from 'react'
import {
	MapPin,
	Calendar,
	Users,
	ClipboardList,
	LoaderCircle,
	IdCard,
	Network,
	History,
	TrendingUp,
	TrendingDown
} from 'lucide-react'
import { formatDate } from '@/context/format-date'
import { formatRelativeTime } from '@/context/format-date-time'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { Enclosure, OrgSpecies } from '@/lib/react-query/queries'
import {
	useEnclosureCountHistory,
	useSpeciesCareInstructions,
	useOrgSpeciesCareInstructions
} from '@/lib/react-query/queries'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { EditEnclosureButton } from './edit-enclosure-button'
import { ResponsiveDialogDrawer } from '../ui/dialog-to-drawer'
import Image from 'next/image'
import EnclosureNotesDialog from './enclosure-notes-dialog'
import { EnclosureLineageGraph } from './enclosure-lineage-graph'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { useUpdateEnclosureActive } from '@/lib/react-query/mutations'
import { CareInstructionDocs } from './care-instruction-docs'
import { UUID } from 'crypto'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

export function EnclosureDialog({
	enclosure,
	species,
	open,
	onOpenChange,
	hideViewTasks = false
}: {
	enclosure: Enclosure
	species: OrgSpecies
	open: boolean
	onOpenChange: (open: boolean) => void
	hideViewTasks?: boolean
}) {
	const [notesOpen, setNotesOpen] = useState(false)
	const [lineageOpen, setLineageOpen] = useState(false)
	const [historyOpen, setHistoryOpen] = useState(false)
	const [navigating, setNavigating] = useState(false)

	const params = useParams()
	const orgId = params?.orgId as UUID

	const router = useRouter()

	const editEnclosureMutation = useUpdateEnclosureActive()
	const [isActive, setIsActive] = useState(enclosure?.is_active ?? true)
	const { data: countHistory, isLoading: historyLoading } = useEnclosureCountHistory(enclosure.id as UUID)
	const { data: defaultDocs } = useSpeciesCareInstructions(species.master_species_id as UUID)
	const { data: orgDocs } = useOrgSpeciesCareInstructions(species.id as UUID)

	const handleActiveChange = (value: boolean) => {
		setIsActive(value)
		editEnclosureMutation.mutate({
			orgId: orgId as UUID,
			enclosure_id: enclosure.id,
			is_active: value
		})
	}

	return (
		<>
			<ResponsiveDialogDrawer
				title={enclosure.name}
				description={species?.custom_common_name}
				open={open}
				onOpenChange={onOpenChange}
				trigger={<div></div>}
				footer={
					<div className='flex flex-col gap-2 w-full'>
						<EditEnclosureButton enclosure={enclosure} spec={species} />
						<div className='flex flex-col gap-2 pt-1'>
							<div className='flex items-center justify-between rounded-md border p-3'>
								<div>
									<Label htmlFor='enclosure-active'>{enclosure?.is_active ? 'Active' : 'Inactive'} Enclosure</Label>
									<p className='text-xs text-muted-foreground'>
										Inactive enclosures are hidden from active-species views.
									</p>
								</div>
								<Switch
									id='enclosure-active'
									checked={isActive}
									onCheckedChange={handleActiveChange}
									disabled={editEnclosureMutation.isPending}
								/>
							</div>
						</div>
					</div>
				}
			>
				<div className='overflow-y-auto max-h-[70vh] scrollbar-hide sm:scrollbar-auto'>
					{!hideViewTasks && (
						<Button
							className='flex gap-2 w-full mb-2'
							disabled={navigating}
							onClick={() => {
								setNavigating(true)
								router.push(`/protected/orgs/${orgId}/enclosures/${enclosure.id}`)
							}}
						>
							{navigating ? <LoaderCircle className='h-4 w-4 animate-spin' /> : <ClipboardList className='h-4 w-4' />}
							View Tasks
						</Button>
					)}
					<Button variant='outline' className='flex gap-2 w-full mb-2' onClick={() => setLineageOpen(true)}>
						<Network className='h-4 w-4' />
						View Lineage
					</Button>
					<div className='grid gap-4'>
						{/* Tank Details */}
						<div className='grid grid-cols-2 gap-3'>
							{enclosure.institutional_specimen_id ? (
								<div className='col-span-2 flex items-center gap-2 rounded-md border p-3'>
									<IdCard className='h-4 w-4 text-muted-foreground shrink-0' />
									<div>
										<p className='text-xs text-muted-foreground'>Internal Tracking ID</p>
										<p className='text-sm font-medium'>{enclosure.institutional_specimen_id}</p>
									</div>
								</div>
							) : (
								''
							)}
							<div className='flex items-center gap-2 rounded-md border p-3'>
								<Calendar className='h-4 w-4 text-muted-foreground shrink-0' />
								<div className='min-w-0'>
									<p className='text-xs text-muted-foreground'>Created</p>
									<p className='text-sm font-medium truncate'>
										{enclosure.created_at ? formatDate(enclosure.created_at) : '—'}
									</p>
								</div>
							</div>
							<div className='flex items-center gap-2 rounded-md border p-3'>
								<Users className='h-4 w-4 text-muted-foreground shrink-0' />
								<div className='flex-1 min-w-0'>
									<p className='text-xs text-muted-foreground'>Current Count</p>
									<p className='text-sm font-medium'>{enclosure.current_count}</p>
								</div>
								<Popover open={historyOpen} onOpenChange={setHistoryOpen}>
									<PopoverTrigger asChild>
										<button
											type='button'
											className='text-muted-foreground hover:text-foreground transition-colors'
											aria-label='Population history'
										>
											<History className='h-4 w-4' />
										</button>
									</PopoverTrigger>
									<PopoverContent className='w-72 p-0' align='end'>
										<div className='flex items-center gap-2 px-3 py-2 border-b'>
											<History className='h-4 w-4 text-muted-foreground' />
											<span className='text-sm font-medium'>Population History</span>
										</div>
										<div className='max-h-64 overflow-y-auto'>
											{historyLoading ? (
												<div className='flex justify-center py-4'>
													<LoaderCircle className='h-4 w-4 animate-spin text-muted-foreground' />
												</div>
											) : !countHistory || countHistory.length === 0 ? (
												<p className='text-xs text-muted-foreground text-center py-4'>No history yet.</p>
											) : (
												<ul className='divide-y'>
													{countHistory.map((entry) => {
														const increased = entry.new_count > entry.old_count
														const profile = entry.profiles
														const name =
															profile?.full_name ??
															(profile?.first_name
																? `${profile.first_name} ${profile.last_name ?? ''}`.trim()
																: 'Unknown')
														return (
															<li key={entry.id} className='flex items-center gap-2 px-3 py-2'>
																{increased ? (
																	<TrendingUp className='h-4 w-4 text-green-500 shrink-0' />
																) : (
																	<TrendingDown className='h-4 w-4 text-red-500 shrink-0' />
																)}
																<div className='flex-1 min-w-0'>
																	<p className='text-sm'>
																		<span className='font-medium'>{entry.old_count}</span>
																		<span className='text-muted-foreground mx-1'>→</span>
																		<span className='font-medium'>{entry.new_count}</span>
																	</p>
																	<p className='text-xs text-muted-foreground truncate'>
																		{name} · {formatRelativeTime(entry.changed_at, true)}
																	</p>
																</div>
															</li>
														)
													})}
												</ul>
											)}
										</div>
									</PopoverContent>
								</Popover>
							</div>
							<div className='col-span-2 flex items-center gap-2 rounded-md border p-3'>
								<MapPin className='h-4 w-4 text-muted-foreground shrink-0' />
								<div>
									<p className='text-xs text-muted-foreground'>Location</p>
									<p className='text-sm font-medium'>{enclosure.locations?.name}</p>
								</div>
							</div>
						</div>

						<Separator />

						{/* Care Instruction Documents */}
						<CareInstructionDocs defaultDocs={defaultDocs ?? []} orgDocs={orgDocs ?? []} />
						<Separator />

						<EnclosureNotesDialog enclosure={enclosure} open={notesOpen} onOpenChange={setNotesOpen} />
						<ResponsiveDialogDrawer
							title='Enclosure Lineage'
							description={`Family tree for ${enclosure.name}`}
							open={lineageOpen}
							onOpenChange={setLineageOpen}
							trigger={null}
							className='sm:max-w-4xl'
						>
							<EnclosureLineageGraph enclosureId={enclosure.id} orgId={orgId} />
						</ResponsiveDialogDrawer>
					</div>
				</div>
			</ResponsiveDialogDrawer>
		</>
	)
}
