'use client'
import { format } from 'date-fns'
import { MapPin, Calendar, Users, ClipboardList, StickyNote, PlusIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Enclosure } from '@/lib/react-query/queries'
import { useEnclosureNotes } from '@/lib/react-query/queries'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import CreateTankNote from './create-tank-note'
import DeleteEnclosureButton from './delete-enclosure-button'
import { ResponsiveDialogDrawer } from '../ui/dialog-to-drawer'
import { useState } from 'react'

export function EnclosureDialog({
	enclosure,
	common_name,
	scientific_name,
	open,
	onOpenChange
}: {
	enclosure: Enclosure
	common_name: string
	scientific_name: string
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const { data: enclosureNotes } = useEnclosureNotes(enclosure.id)

	const params = useParams()
	const orgId = params?.orgId as number | undefined

	const router = useRouter()

	return (
		<ResponsiveDialogDrawer
			title={enclosure.name + ' - ' + common_name}
			description={scientific_name}
			open={open}
			onOpenChange={onOpenChange}
			trigger={<div></div>}
		>
			<div className='grid gap-4 py-2'>
				{/* Tank Details */}
				<div className='grid grid-cols-2 gap-3'>
					<div className='flex items-center gap-2 rounded-md border p-3'>
						<MapPin className='h-4 w-4 text-muted-foreground shrink-0' />
						<div className='min-w-0'>
							<p className='text-xs text-muted-foreground'>Location</p>
							<p className='text-sm font-medium truncate'>{enclosure.locations?.name}</p>
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
						<Calendar className='h-4 w-4 text-muted-foreground shrink-0' />
						<div>
							<p className='text-xs text-muted-foreground'>Created</p>
							<p className='text-sm font-medium'>
								{enclosure.created_at ? format(new Date(enclosure.created_at.substring(0, 10)), 'MMM d, yyyy') : ''}
							</p>
						</div>
					</div>
				</div>

				<Separator />

				{/* Enclosure Notes */}
				<div className='space-y-3'>
					<div className='flex items-center gap-2'>
						<StickyNote className='h-4 w-4 text-muted-foreground' />
						<h4 className='text-sm font-semibold'>Enclosure Notes</h4>
						<Badge variant='secondary' className='ml-auto'>
							{enclosureNotes?.length}
						</Badge>
					</div>

					{enclosureNotes?.length && enclosureNotes.length > 0 ? (
						<div className='space-y-2 max-h-[200px] overflow-y-auto rounded-md border p-3'>
							{enclosureNotes.map((note) => (
								<div key={note.id} className='rounded-md bg-muted p-3 space-y-1'>
									<p className='text-sm'>{note.note_text}</p>
									<p className='text-xs text-muted-foreground'>
										{note.created_at && format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
									</p>
								</div>
							))}
						</div>
					) : (
						<div className='rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground'>
							No notes for this enclosure yet.
						</div>
					)}

					{/* Add note textarea placeholder */}

					<CreateTankNote enclosureId={enclosure.id} />
					<div className='flex flex-row justify-between'>
						<DeleteEnclosureButton enclosure_id={enclosure.id} onDeleted={() => onOpenChange(false)} />
						<Button variant='outline' onClick={() => onOpenChange(false)}>
							Close
						</Button>
						<Button
							className='gap-2'
							onClick={() => router.push(`/protected/orgs/${orgId}/enclosures/${enclosure.id}`)}
						>
							<ClipboardList className='h-4 w-4' />
							View Tasks
						</Button>
					</div>
				</div>
			</div>
		</ResponsiveDialogDrawer>
	)
}
