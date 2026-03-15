'use client'

import { useState } from 'react'
import { UUID } from 'crypto'

import { type MemberProfile } from '@/lib/react-query/queries'
import { useReassignSchedule, useReassignTask } from '@/lib/react-query/mutations'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Check, CircleUserRound, LoaderCircle, User, UserX } from 'lucide-react'

export function ReassignMemberButton({
	scheduleId,
	taskId,
	assignedTo,
	assignedMemberName,
	members,
	disabled = false,
	disabledReason
}: {
	scheduleId?: UUID
	taskId?: UUID
	assignedTo: UUID | null
	assignedMemberName: string | null
	members: MemberProfile[]
	disabled?: boolean
	disabledReason?: string
}) {
	const [open, setOpen] = useState(false)
	const [selectedId, setSelectedId] = useState<string | null>(assignedTo as string | null)
	const reassignSchedule = useReassignSchedule()
	const reassignTask = useReassignTask()
	const reassign = taskId ? reassignTask : reassignSchedule

	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen) setSelectedId(assignedTo as string | null)
		setOpen(isOpen)
	}

	const displayName = assignedMemberName ?? 'Unassigned'
	const hasChanged = selectedId !== (assignedTo as string | null)

	return (
		<>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant='ghost'
							size='sm'
							className='h-7 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground font-normal shrink-0 bg-muted hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-60'
							disabled={disabled}
							onClick={(e) => {
								e.stopPropagation()
								if (disabled) return
								handleOpenChange(true)
							}}
						>
							<User className='h-3.5 w-3.5 shrink-0' />
							<span className='max-w-28 truncate'>{displayName}</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>{disabled ? (disabledReason ?? 'Reassignment unavailable') : 'Reassign member'}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			<ResponsiveDialogDrawer
				title='Reassign Schedule'
				description='Select a member to assign this schedule to.'
				trigger={null}
				open={open}
				onOpenChange={handleOpenChange}
				footer={
					<div className='flex gap-2 w-full'>
						<Button
							className='flex-1'
							disabled={disabled || reassign.isPending || !hasChanged}
							onClick={() => {
								if (disabled) return
								if (taskId) {
									reassignTask.mutate(
										{ taskId, memberId: selectedId as UUID | null },
										{ onSuccess: () => setOpen(false) }
									)
								} else if (scheduleId) {
									reassignSchedule.mutate(
										{ scheduleId, memberId: selectedId as UUID | null },
										{ onSuccess: () => setOpen(false) }
									)
								}
							}}
						>
							{reassign.isPending ? <LoaderCircle className='h-4 w-4 animate-spin' /> : 'Confirm'}
						</Button>
					</div>
				}
			>
				<div className='space-y-1 py-1'>
					{/* Unassign option */}
					<button
						type='button'
						onClick={() => setSelectedId(null)}
						className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left ${
							selectedId === null ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
						}`}
					>
						<div className='h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0'>
							<UserX className='h-4 w-4 text-muted-foreground' />
						</div>
						<span className='italic text-muted-foreground flex-1'>Unassigned</span>
						{selectedId === null && <Check className='h-4 w-4 text-primary shrink-0' />}
					</button>
					{members.map((member) => {
						const name = member.full_name || `${member.first_name} ${member.last_name}`.trim()
						const isSelected = selectedId === (member.id as string)
						return (
							<button
								key={member.id as string}
								type='button'
								onClick={() => setSelectedId(member.id as string)}
								className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left ${
									isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
								}`}
							>
								<div className='h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0'>
									<CircleUserRound className='h-4 w-4 text-muted-foreground' />
								</div>
								<div className='flex flex-col min-w-0 flex-1'>
									<span className={`font-medium truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
										{name}
									</span>
									<span className='text-xs text-muted-foreground truncate'>{member.email}</span>
								</div>
								{isSelected && <Check className='h-4 w-4 text-primary shrink-0' />}
							</button>
						)
					})}
				</div>
			</ResponsiveDialogDrawer>
		</>
	)
}
