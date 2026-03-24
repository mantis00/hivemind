'use client'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Label } from '@/components/ui/label'
import { UserPlusIcon, LoaderCircle } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { useInviteMember } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useParams } from 'next/navigation'
import { UUID } from 'crypto'
import { useAllProfiles, useIsOwnerOrSuperadmin, useOrgMembers } from '@/lib/react-query/queries'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { VirtualizedCommand, type VirtualizedOption } from '@/components/virtualized-combobox'

const FALLBACK_ROW_HEIGHT = 44

export function InviteMemberButton() {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const isOwnerOrSuperadmin = useIsOwnerOrSuperadmin(orgId)

	if (!isOwnerOrSuperadmin || !orgId) return null

	return <InviteMemberButtonContent orgId={orgId} />
}

function InviteMemberButtonContent({ orgId }: { orgId: UUID }) {
	const [open, setOpen] = useState(false)
	const [userDropdownOpen, setUserDropdownOpen] = useState(false)
	const [selectedInviteeId, setSelectedInviteeId] = useState<string>('')
	const [accessLvl, setAccessLvl] = useState('1')
	const { data: user } = useCurrentClientUser()
	const inviteMutation = useInviteMember()
	const { data: profiles, isLoading: isLoadingProfiles } = useAllProfiles()
	const { data: orgMembers, isLoading: isLoadingOrgMembers } = useOrgMembers(orgId)

	// Filter out users who are already members of the organization
	const inviteCandidates = useMemo(() => {
		const memberIds = new Set((orgMembers ?? []).map((member) => member.user_id))
		return (profiles ?? []).filter((profile) => {
			return !memberIds.has(String(profile.id))
		})
	}, [orgMembers, profiles])
	const inviteOptions = useMemo<VirtualizedOption[]>(
		() =>
			(inviteCandidates ?? []).map((candidate) => ({
				value: String(candidate.id),
				label: candidate.full_name || '',
				subLabel: candidate.email || ''
			})),
		[inviteCandidates]
	)

	const selectedInvitee = inviteCandidates.find((candidate) => String(candidate.id) === selectedInviteeId)
	const isLoadingInviteCandidates = isLoadingProfiles || isLoadingOrgMembers
	const commandHeight = `${Math.min(Math.max(inviteOptions.length * FALLBACK_ROW_HEIGHT, 220), 320)}px`

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!user?.id || !selectedInviteeId || !selectedInvitee?.email) return

		inviteMutation.mutate(
			{
				orgId: orgId,
				inviterId: user.id,
				inviteeId: selectedInviteeId,
				inviteeEmail: selectedInvitee.email,
				accessLvl: Number(accessLvl)
			},
			{
				onSuccess: () => {
					setSelectedInviteeId('')
					setUserDropdownOpen(false)
					setOpen(false)
					setAccessLvl('1')
				}
			}
		)
	}

	return (
		<ResponsiveDialogDrawer
			title='Invite Member'
			description='Select a user and access level for the new member.'
			trigger={
				<Button variant='default'>
					Invite Member <UserPlusIcon className='w-4 h-4' />
				</Button>
			}
			open={open}
			onOpenChange={(isOpen) => {
				setOpen(isOpen)
				if (!isOpen) {
					setUserDropdownOpen(false)
				}
			}}
		>
			<form onSubmit={handleSubmit} data-vaul-no-drag>
				<div className='grid gap-4 py-4'>
					<div className='grid gap-2'>
						<Label htmlFor='invitee-search'>Select User</Label>
						<Popover open={userDropdownOpen} onOpenChange={setUserDropdownOpen}>
							<PopoverTrigger asChild>
								<Button
									id='invitee-search'
									type='button'
									variant='outline'
									className='w-full justify-start text-left font-normal'
									disabled={inviteMutation.isPending}
								>
									{selectedInvitee ? (
										<span className='truncate'>
											{selectedInvitee.full_name}
											<span className='text-muted-foreground'> - {selectedInvitee.email}</span>
										</span>
									) : (
										<span className='text-muted-foreground'>Choose a user</span>
									)}
								</Button>
							</PopoverTrigger>
							<PopoverContent
								className='w-(--radix-popover-trigger-width) p-0'
								data-vaul-no-drag
								align='start'
								side='bottom'
							>
								{isLoadingInviteCandidates ? (
									<div className='flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground'>
										<LoaderCircle className='h-4 w-4 animate-spin' />
										Loading users...
									</div>
								) : inviteOptions.length === 0 ? (
									<div className='py-6 text-center text-sm text-muted-foreground'>No eligible users found.</div>
								) : (
									<VirtualizedCommand
										height={commandHeight}
										options={inviteOptions}
										placeholder='Search users...'
										selectedOption={selectedInviteeId}
										emptyMessage='No eligible users found.'
										onSelectOption={(currentValue) => {
											setSelectedInviteeId(currentValue === selectedInviteeId ? '' : currentValue)
											setUserDropdownOpen(false)
										}}
									/>
								)}
							</PopoverContent>
						</Popover>
					</div>
					<div className='grid gap-2'>
						<Label htmlFor='access-level'>Access Level</Label>
						<Select value={accessLvl} onValueChange={setAccessLvl} disabled={inviteMutation.isPending}>
							<SelectTrigger id='access-level'>
								<SelectValue placeholder='Select access level' />
							</SelectTrigger>
							<SelectContent position='popper' side='bottom' align='start'>
								<SelectItem value='1'>Caretaker</SelectItem>
								<SelectItem value='2'>Owner</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
				<Button type='submit' className='w-full' disabled={inviteMutation.isPending || !user || !selectedInviteeId}>
					{inviteMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Send Invite'}
				</Button>
			</form>
		</ResponsiveDialogDrawer>
	)
}
