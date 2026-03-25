'use client'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Label } from '@/components/ui/label'
import { UserPlusIcon, LoaderCircle } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useInviteMember } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useParams } from 'next/navigation'
import { UUID } from 'crypto'
import { useAllProfiles, useIsOwnerOrSuperadmin, useOrgMembers } from '@/lib/react-query/queries'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { VirtualizedCommand, type VirtualizedOption } from '@/components/ui/virtualized-combobox'
import { useMediaQuery } from '@/hooks/use-media-query'

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
	const isDesktop = useMediaQuery('(min-width: 768px)')
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
	const commandHeight = '320px'

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) {
			setUserDropdownOpen(false)
		}
		setOpen(isOpen)
	}

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
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
			className='pb-[calc(env(keyboard-inset-height,0px)+1.5rem)]'
			trigger={
				<Button variant='default' onClick={() => setOpen(true)}>
					Invite Member <UserPlusIcon className='w-4 h-4' />
				</Button>
			}
			open={open}
			onOpenChange={handleOpenChange}
		>
			<form onSubmit={handleSubmit} data-vaul-no-drag>
				<div className='grid gap-4 pt-2 pb-4'>
					<div className='grid gap-2'>
						<Label htmlFor='invitee-search'>Select User</Label>
						{isDesktop ? (
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
										<div className='**:data-[slot=command-group]:p-0 **:data-[slot=command-item]:pl-1 **:data-[slot=command-item]:pr-2 **:data-[slot=command-item]:cursor-pointer'>
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
										</div>
									)}
								</PopoverContent>
							</Popover>
						) : (
							<>
								<Button
									id='invitee-search'
									type='button'
									variant='outline'
									className='w-full justify-start text-left font-normal'
									disabled={inviteMutation.isPending}
									onClick={() => setUserDropdownOpen((prev) => !prev)}
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
								{userDropdownOpen ? (
									<div className='rounded-md border p-0 **:data-[slot=command-input]:text-base **:data-[slot=command-input]:md:text-sm'>
										{isLoadingInviteCandidates ? (
											<div className='flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground'>
												<LoaderCircle className='h-4 w-4 animate-spin' />
												Loading users...
											</div>
										) : inviteOptions.length === 0 ? (
											<div className='py-6 text-center text-sm text-muted-foreground'>No eligible users found.</div>
										) : (
											<div className='**:data-[slot=command-group]:p-0 **:data-[slot=command-item]:pl-1 **:data-[slot=command-item]:pr-2 **:data-[slot=command-item]:cursor-pointer'>
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
											</div>
										)}
									</div>
								) : null}
							</>
						)}
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
