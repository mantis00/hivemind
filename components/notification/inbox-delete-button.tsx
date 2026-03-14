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
				<div className='flex flex-col-reverse items-center justify-center gap-2 pt-2 sm:flex-row sm:justify-end'>
					<Button
						variant='outline'
						size='sm'
						className='w-full sm:w-auto'
						onClick={() => setSingleDeleteOpen(false)}
						disabled={isDeleting}
					>
						Cancel
					</Button>

					<Button
						variant='destructive'
						size='sm'
						className='w-full sm:w-auto'
						onClick={onConfirmDeleteSingle}
						disabled={isDeleting}
					>
						{isDeleting ? 'Deleting...' : 'Delete'}
					</Button>
				</div>
			</ResponsiveDialogDrawer>

			{/* Bulk delete confirmation */}
			<ResponsiveDialogDrawer
				title={`Delete ${selectedCount} notification${selectedCount !== 1 ? 's' : ''}`}
				description={`Are you sure you want to delete ${selectedCount} selected notification${selectedCount !== 1 ? 's' : ''}? This action cannot be undone.`}
				trigger={<span />}
				open={bulkDeleteOpen}
				onOpenChange={setBulkDeleteOpen}
			>
				<div className='flex flex-col-reverse items-center justify-center gap-2 pt-2 sm:flex-row sm:justify-end'>
					<Button
						variant='outline'
						size='sm'
						className='w-full sm:w-auto'
						onClick={() => setBulkDeleteOpen(false)}
						disabled={isDeleting}
					>
						Cancel
					</Button>

					<Button
						variant='destructive'
						size='sm'
						className='w-full sm:w-auto'
						onClick={onConfirmBulkDelete}
						disabled={isDeleting}
					>
						{isDeleting ? 'Deleting...' : `Delete ${selectedCount} notification${selectedCount !== 1 ? 's' : ''}`}
					</Button>
				</div>
			</ResponsiveDialogDrawer>
		</>
	)
}
