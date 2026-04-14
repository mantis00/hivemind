'use client'

import { useState } from 'react'
import { UUID } from 'crypto'
import { useRouter } from 'next/navigation'

import { useDeleteTask, useDeleteTasks } from '@/lib/react-query/mutations'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { LoaderCircle, Trash2 } from 'lucide-react'

interface DeleteTaskButtonProps {
	/** Single-task mode */
	taskId?: UUID
	/** Batch mode – provide a list of IDs instead of a single taskId */
	taskIds?: UUID[]
	taskName?: string | null
	redirectTo?: string
	/** Called after a successful delete (in addition to any redirect) */
	onDeleted?: () => void
}

export function DeleteTaskButton({ taskId, taskIds, taskName, redirectTo, onDeleted }: DeleteTaskButtonProps) {
	const [open, setOpen] = useState(false)
	const deleteTask = useDeleteTask()
	const deleteTasks = useDeleteTasks()
	const router = useRouter()

	const isBatch = Array.isArray(taskIds) && taskIds.length > 0
	const isPending = isBatch ? deleteTasks.isPending : deleteTask.isPending

	const handleDelete = () => {
		if (isBatch) {
			deleteTasks.mutate(
				{ taskIds: taskIds! },
				{
					onSuccess: () => {
						setOpen(false)
						onDeleted?.()
					}
				}
			)
		} else if (taskId) {
			deleteTask.mutate(
				{ taskId },
				{
					onSuccess: () => {
						setOpen(false)
						onDeleted?.()
						if (redirectTo) router.push(redirectTo)
						else router.back()
					}
				}
			)
		}
	}

	const confirmLabel = isBatch ? `Delete ${taskIds!.length} task${taskIds!.length === 1 ? '' : 's'}` : 'Delete'

	const bodyText = isBatch
		? `Are you sure you want to permanently delete ${taskIds!.length} task${taskIds!.length === 1 ? '' : 's'}?`
		: `Are you sure you want to delete task:${taskName ? ` "${taskName}"` : ' this task'}?`

	return (
		<>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant='ghost'
							size='icon'
							className='h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10'
							onClick={(e) => {
								e.stopPropagation()
								setOpen(true)
							}}
						>
							<Trash2 className='h-4 w-4' />
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>{isBatch ? `Delete ${taskIds!.length} tasks` : 'Delete task'}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			<ResponsiveDialogDrawer
				title={isBatch ? 'Delete Tasks' : 'Delete Task'}
				description='This action cannot be undone.'
				trigger={null}
				open={open}
				onOpenChange={setOpen}
				footer={
					<div className='flex gap-2 w-full'>
						<Button variant='outline' className='flex-1' onClick={() => setOpen(false)} disabled={isPending}>
							Cancel
						</Button>
						<Button variant='destructive' className='flex-1' disabled={isPending} onClick={handleDelete}>
							{isPending ? <LoaderCircle className='h-4 w-4 animate-spin' /> : confirmLabel}
						</Button>
					</div>
				}
			>
				<p className='text-sm text-muted-foreground'>{bodyText}</p>
			</ResponsiveDialogDrawer>
		</>
	)
}
