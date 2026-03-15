'use client'

import { useState } from 'react'
import { UUID } from 'crypto'
import { useRouter } from 'next/navigation'

import { useDeleteTask } from '@/lib/react-query/mutations'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { LoaderCircle, Trash2 } from 'lucide-react'

export function DeleteTaskButton({
	taskId,
	taskName,
	redirectTo
}: {
	taskId: UUID
	taskName: string | null
	redirectTo?: string
}) {
	const [open, setOpen] = useState(false)
	const deleteTask = useDeleteTask()
	const router = useRouter()

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
						<p>Delete task</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			<ResponsiveDialogDrawer
				title='Delete Task'
				description='This action cannot be undone.'
				trigger={null}
				open={open}
				onOpenChange={setOpen}
				footer={
					<div className='flex gap-2 w-full'>
						<Button variant='outline' className='flex-1' onClick={() => setOpen(false)} disabled={deleteTask.isPending}>
							Cancel
						</Button>
						<Button
							variant='destructive'
							className='flex-1'
							disabled={deleteTask.isPending}
							onClick={() =>
								deleteTask.mutate(
									{ taskId },
									{
										onSuccess: () => {
											setOpen(false)
											if (redirectTo) router.push(redirectTo)
											else router.back()
										}
									}
								)
							}
						>
							{deleteTask.isPending ? <LoaderCircle className='h-4 w-4 animate-spin' /> : 'Delete'}
						</Button>
					</div>
				}
			>
				<p className='text-sm text-muted-foreground'>
					Are you sure you want to delete task:{taskName ? ` "${taskName}"` : ' this task'}?
				</p>
			</ResponsiveDialogDrawer>
		</>
	)
}
