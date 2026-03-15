'use client'

import { useEnclosureNotes, type Enclosure } from '@/lib/react-query/queries'
import CreateEnclosureNote from './create-enclosure-note'
import { ResponsiveDialogDrawer } from '../ui/dialog-to-drawer'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ChevronDown, LoaderCircle, StickyNote } from 'lucide-react'
import { format } from 'date-fns'

export default function EnclosureNotesDialog({
	enclosure,
	open,
	onOpenChange
}: {
	enclosure: Enclosure
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const { data: enclosureNotes, isLoading } = useEnclosureNotes(enclosure.id)
	return (
		<ResponsiveDialogDrawer
			title='Notes'
			description={`${enclosureNotes?.length} notes for ${enclosure.name}`}
			trigger={
				<Button variant='secondary' className='flex items-center gap-2 w-full' disabled={isLoading}>
					<StickyNote className='h-4 w-4 text-muted-foreground' />
					<h4 className='text-sm font-semibold'>Enclosure Notes</h4>
					<Badge variant='secondary' className='ml-auto'>
						{enclosureNotes?.length}
					</Badge>
					<ChevronDown className='h-4 w-4 text-muted-foreground transition-transform duration-200' />
				</Button>
			}
			open={open}
			onOpenChange={onOpenChange}
			className='md:min-w-[500px]'
		>
			{isLoading ? (
				<LoaderCircle className='animate-spin mx-auto' />
			) : enclosureNotes?.length && enclosureNotes.length > 0 ? (
				<div className='space-y-2 overflow-y-auto max-h-[500px] rounded-md border p-3 scrollbar-hide'>
					{enclosureNotes.map((note) => (
						<div key={note.id} className='rounded-md bg-muted p-3 space-y-1'>
							<p className='text-sm'>{note.note_text}</p>
							<div className='flex flex-row'>
								<p className='text-xs text-muted-foreground'>
									{note.created_at && format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
								</p>
								<p className='ml-auto text-xs text-muted-foreground'>
									{note.user ? `${note.user?.first_name} ${note.user?.last_name[0]}.` : ' '}
								</p>
							</div>
						</div>
					))}
				</div>
			) : (
				<div className='rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground'>
					No notes for this enclosure yet.
				</div>
			)}
			<CreateEnclosureNote enclosureId={enclosure.id} is_active={enclosure?.is_active} />
		</ResponsiveDialogDrawer>
	)
}
