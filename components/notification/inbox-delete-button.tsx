import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import type { NotificationWithProfile } from '@/context/notifications-with-profiles'

interface InboxDeleteDialogsProps {
	// Single delete
	deleteTarget: NotificationWithProfile | null
	singleDeleteOpen: boolean
	setSingleDeleteOpen: (open: boolean) => void
	onConfirmDeleteSingle: () => void
	setDeleteTarget: (target: NotificationWithProfile | null) => void

	// Bulk delete
	selectedCount: number
	bulkDeleteOpen: boolean
	setBulkDeleteOpen: (open: boolean) => void
	onConfirmBulkDelete: () => void

	// Shared
	isDeleting: boolean
}

export function InboxDeleteDialogs({
	deleteTarget,
	singleDeleteOpen,
	setSingleDeleteOpen,
	onConfirmDeleteSingle,
	setDeleteTarget,
	selectedCount,
	bulkDeleteOpen,
	setBulkDeleteOpen,
	onConfirmBulkDelete,
	isDeleting
}: InboxDeleteDialogsProps) {
	return (
		<>
			{/* Single delete confirmation */}
			<ResponsiveDialogDrawer
				title='Delete notification'
				description={`Are you sure you want to delete this notification from ${
					deleteTarget?.senderProfile?.full_name ?? 'Unknown'
				}? This action cannot be undone.`}
				trigger={<span />}
				open={singleDeleteOpen}
				onOpenChange={(open) => {
					setSingleDeleteOpen(open)
					if (!open) setDeleteTarget(null)
				}}
			>
				<Button
					variant='destructive'
					size='sm'
					className='w-full'
					onClick={onConfirmDeleteSingle}
					disabled={isDeleting}
				>
					{isDeleting ? 'Deleting...' : 'Delete notification'}
				</Button>
			</ResponsiveDialogDrawer>

			{/* Bulk delete confirmation */}
			<ResponsiveDialogDrawer
				title={`Delete ${selectedCount} notification${selectedCount !== 1 ? 's' : ''}`}
				description={`Are you sure you want to delete ${selectedCount} selected notification${selectedCount !== 1 ? 's' : ''}? This action cannot be undone.`}
				trigger={<span />}
				open={bulkDeleteOpen}
				onOpenChange={setBulkDeleteOpen}
			>
				<Button variant='destructive' size='sm' className='w-full' onClick={onConfirmBulkDelete} disabled={isDeleting}>
					{isDeleting ? 'Deleting...' : `Delete ${selectedCount} notification${selectedCount !== 1 ? 's' : ''}`}
				</Button>
			</ResponsiveDialogDrawer>
		</>
	)
}
