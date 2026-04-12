'use client'

import { useState } from 'react'
import { X, ListChecks, CheckSquare, Trash2 } from 'lucide-react'
import { UUID } from 'crypto'
import { LoaderCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { useIsMobile } from '@/hooks/use-mobile'
import { useDeleteTasks } from '@/lib/react-query/mutations'

export type SelectModeType = 'complete' | 'delete'

interface TasksSelectButtonProps {
	selectMode: boolean
	selectModeType: SelectModeType | null
	selectedIds: string[]
	onStartSelectMode: (mode: SelectModeType) => void
	onCancelSelect: () => void
	onBatchComplete: () => void
}

export function TasksSelectButton({
	selectMode,
	selectModeType,
	selectedIds,
	onStartSelectMode,
	onCancelSelect,
	onBatchComplete
}: TasksSelectButtonProps) {
	const [chooseOpen, setChooseOpen] = useState(false)
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
	const isMobile = useIsMobile()
	const deleteTasks = useDeleteTasks()

	const selectedCount = selectedIds.length

	const handleConfirmDelete = () => {
		deleteTasks.mutate(
			{ taskIds: selectedIds as UUID[] },
			{
				onSuccess: () => {
					setConfirmDeleteOpen(false)
					onCancelSelect()
				}
			}
		)
	}

	// ── In select mode: show cancel + action button ───────────────────────────
	if (selectMode) {
		return (
			<>
				<Button
					variant='outline'
					className={isMobile ? 'h-8 gap-1.5 text-sm' : 'gap-2'}
					size={isMobile ? 'sm' : 'default'}
					onClick={onCancelSelect}
				>
					<X className={isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
					{isMobile ? 'Cancel' : 'Cancel Selection'}
				</Button>

				{selectedCount > 0 && selectModeType === 'complete' && (
					<Button
						className={isMobile ? 'h-8 gap-1.5 text-sm' : 'gap-2'}
						size={isMobile ? 'sm' : 'default'}
						onClick={onBatchComplete}
					>
						<CheckSquare className={isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
						{isMobile ? `Complete (${selectedCount})` : `Batch Complete (${selectedCount})`}
					</Button>
				)}

				{selectedCount > 0 && selectModeType === 'delete' && (
					<>
						<Button
							variant='destructive'
							className={isMobile ? 'h-8 gap-1.5 text-sm' : 'gap-2'}
							size={isMobile ? 'sm' : 'default'}
							onClick={() => setConfirmDeleteOpen(true)}
						>
							<Trash2 className={isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
							{isMobile ? `Delete (${selectedCount})` : `Batch Delete (${selectedCount})`}
						</Button>

						{/* Batch delete confirmation */}
						<ResponsiveDialogDrawer
							title='Delete Tasks'
							description='This action cannot be undone.'
							trigger={null}
							open={confirmDeleteOpen}
							onOpenChange={setConfirmDeleteOpen}
							footer={
								<div className='flex gap-2 w-full'>
									<Button
										variant='outline'
										className='flex-1'
										onClick={() => setConfirmDeleteOpen(false)}
										disabled={deleteTasks.isPending}
									>
										Cancel
									</Button>
									<Button
										variant='destructive'
										className='flex-1'
										disabled={deleteTasks.isPending}
										onClick={handleConfirmDelete}
									>
										{deleteTasks.isPending ? (
											<LoaderCircle className='h-4 w-4 animate-spin' />
										) : (
											`Delete ${selectedCount} task${selectedCount === 1 ? '' : 's'}`
										)}
									</Button>
								</div>
							}
						>
							<p className='text-sm text-muted-foreground'>
								Are you sure you want to permanently delete{' '}
								<span className='font-medium text-foreground'>
									{selectedCount} task{selectedCount === 1 ? '' : 's'}
								</span>
								?
							</p>
						</ResponsiveDialogDrawer>
					</>
				)}
			</>
		)
	}

	// ── Not in select mode: show trigger button → choose-mode dialog ──────────
	return (
		<ResponsiveDialogDrawer
			title='Select Tasks'
			description='Choose what you would like to do with the selected tasks.'
			trigger={
				<Button
					variant='outline'
					className={isMobile ? 'h-8 gap-1.5 text-sm' : 'gap-2'}
					size={isMobile ? 'sm' : 'default'}
					onClick={() => setChooseOpen(true)}
				>
					<ListChecks className={isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
					{isMobile ? 'Select' : 'Select Tasks'}
				</Button>
			}
			open={chooseOpen}
			onOpenChange={setChooseOpen}
		>
			<div className='flex flex-col gap-3 pb-2'>
				<button
					className='flex items-start gap-4 rounded-lg border px-4 py-3 text-left transition-colors border-border hover:bg-muted/50 cursor-pointer'
					onClick={() => {
						setChooseOpen(false)
						onStartSelectMode('complete')
					}}
				>
					<CheckSquare className='mt-0.5 h-5 w-5 text-primary shrink-0' />
					<div>
						<p className='text-sm font-medium'>Batch Complete</p>
						<p className='text-xs text-muted-foreground'>
							Select tasks of the same type to mark them as completed together.
						</p>
					</div>
				</button>

				<button
					className='flex items-start gap-4 rounded-lg border px-4 py-3 text-left transition-colors border-border hover:bg-destructive/10 cursor-pointer'
					onClick={() => {
						setChooseOpen(false)
						onStartSelectMode('delete')
					}}
				>
					<Trash2 className='mt-0.5 h-5 w-5 text-destructive shrink-0' />
					<div>
						<p className='text-sm font-medium text-destructive'>Batch Delete</p>
						<p className='text-xs text-muted-foreground'>
							Select any tasks to permanently delete them. This cannot be undone.
						</p>
					</div>
				</button>
			</div>
		</ResponsiveDialogDrawer>
	)
}
