'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { MapPin, Calendar, Users, ClipboardList, LoaderCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { Enclosure, OrgSpecies } from '@/lib/react-query/queries'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import DeleteEnclosureButton from './delete-enclosure-button'
import { EditEnclosureButton } from './edit-enclosure-button'
import { ResponsiveDialogDrawer } from '../ui/dialog-to-drawer'
import EnclosureNotesDialog from './enclosure-notes-dialog'

export function EnclosureDialog({
	enclosure,
	species,
	open,
	onOpenChange
}: {
	enclosure: Enclosure
	species: OrgSpecies
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const [notesOpen, setNotesOpen] = useState(false)
	const [navigating, setNavigating] = useState(false)

	const params = useParams()
	const orgId = params?.orgId as number | undefined

	const router = useRouter()

	return (
		<ResponsiveDialogDrawer
			title={enclosure.name}
			description={species?.custom_common_name}
			open={open}
			onOpenChange={onOpenChange}
			trigger={<div></div>}
			footer={
				<div className='flex flex-col gap-2 w-full'>
					<EditEnclosureButton enclosure={enclosure} spec={species} />
					<DeleteEnclosureButton enclosure_id={enclosure.id} onDeleted={() => onOpenChange(false)} />
				</div>
			}
		>
			<div className='overflow-y-auto max-h-[70vh] scrollbar-hide sm:scrollbar-auto'>
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
				<div className='grid gap-4'>
					{/* Tank Details */}
					<div className='grid grid-cols-2 gap-3'>
						<div className='flex items-center gap-2 rounded-md border p-3'>
							<Calendar className='h-4 w-4 text-muted-foreground shrink-0' />
							<div className='min-w-0'>
								<p className='text-xs text-muted-foreground'>Created</p>
								<p className='text-sm font-medium truncate'>
									{enclosure.created_at ? format(new Date(enclosure.created_at.substring(0, 10)), 'MMM d, yyyy') : ''}
								</p>
							</div>
						</div>
						<div className='flex items-center gap-2 rounded-md border p-3'>
							<Users className='h-4 w-4 text-muted-foreground shrink-0' />
							<div>
								<p className='text-xs text-muted-foreground'>Current Count</p>
								<p className='text-sm font-medium'>{enclosure.current_count}</p>
							</div>
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

					<EnclosureNotesDialog enclosure={enclosure} open={notesOpen} onOpenChange={setNotesOpen} />
				</div>
			</div>
		</ResponsiveDialogDrawer>
	)
}
