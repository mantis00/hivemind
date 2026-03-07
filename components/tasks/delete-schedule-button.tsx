'use client'

import { useState } from 'react'
import { UUID } from 'crypto'

import { useDeleteSchedule } from '@/lib/react-query/mutations'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { LoaderCircle, Trash2 } from 'lucide-react'

export function DeleteScheduleButton({ scheduleId, taskName }: { scheduleId: UUID; taskName: string | null }) {
	const [open, setOpen] = useState(false)
	const deleteSchedule = useDeleteSchedule()

	return (
		<>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant='ghost'
							size='icon'
							className='h-5 w-5 text-muted-foreground hover:text-destructive'
							onClick={(e) => {
								e.stopPropagation()
								setOpen(true)
							}}
						>
							<Trash2 className='h-3 w-3' />
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Delete schedule</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			<ResponsiveDialogDrawer
				title='Delete Schedule'
				description='This action cannot be undone. Existing tasks already generated will remain, but no new tasks will be created.'
				trigger={null}
				open={open}
				onOpenChange={setOpen}
				footer={
					<div className='flex gap-2 w-full'>
						<Button
							variant='destructive'
							className='flex-1'
							disabled={deleteSchedule.isPending}
							onClick={() => deleteSchedule.mutate({ scheduleId }, { onSuccess: () => setOpen(false) })}
						>
							{deleteSchedule.isPending ? <LoaderCircle className='h-4 w-4 animate-spin' /> : 'Delete Schedule'}
						</Button>
					</div>
				}
			>
				<p className='text-sm text-muted-foreground'>Delete the schedule{taskName ? ` for "${taskName}"` : ''}?</p>
			</ResponsiveDialogDrawer>
		</>
	)
}
