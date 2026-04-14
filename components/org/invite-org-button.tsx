'use client'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Label } from '@/components/ui/label'
import { UserPlusIcon, LoaderCircle, ChevronDown } from 'lucide-react'
import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from 'react'
import { useInviteMember } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useParams } from 'next/navigation'
import { UUID } from 'crypto'
import { useAllProfiles, useIsOwnerOrSuperadmin, useOrgMembers } from '@/lib/react-query/queries'
import { VirtualizedCommand, type VirtualizedOption } from '@/components/ui/virtualized-combobox'

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
	const [keyboardOffset, setKeyboardOffset] = useState(0)
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
	const commandHeight = '320px'
	const shouldLiftForKeyboard = keyboardOffset > 80
	const liftAmount = shouldLiftForKeyboard ? Math.min(keyboardOffset - 16, 260) : 0
	const mobileLiftStyle: CSSProperties | undefined = shouldLiftForKeyboard
		? {
				transform: `translateY(-${liftAmount}px)`,
				transition: 'transform 160ms ease-out'
			}
		: undefined

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) {
			setUserDropdownOpen(false)
			setKeyboardOffset(0)
		}
		setOpen(isOpen)
	}

	useEffect(() => {
		if (!open || typeof window === 'undefined' || !window.visualViewport) {
			return
		}

		const viewport = window.visualViewport
		const updateOffset = () => {
			const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
			setKeyboardOffset(offset)
		}

		updateOffset()
		viewport.addEventListener('resize', updateOffset)
		viewport.addEventListener('scroll', updateOffset)

		return () => {
			viewport.removeEventListener('resize', updateOffset)
			viewport.removeEventListener('scroll', updateOffset)
		}
	}, [open])

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
			trigger={
				<Button variant='default' onClick={() => setOpen(true)}>
					Invite Member <UserPlusIcon className='w-4 h-4' />
				</Button>
			}
			open={open}
			onOpenChange={handleOpenChange}
		>
			<form onSubmit={handleSubmit} data-vaul-no-drag style={mobileLiftStyle}>
				<div className='grid gap-4 pt-2 pb-4'>
					<div className='grid gap-2'>
						<Label htmlFor='invitee-search'>Select User</Label>
						<Button
							id='invitee-search'
							type='button'
							variant='outline'
							className='w-full justify-start text-left font-normal gap-2'
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
							<ChevronDown
								className={`ml-auto h-4 w-4 shrink-0 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`}
							/>
						</Button>
						{userDropdownOpen && (
							<div className='rounded-md border p-0 **:data-[slot=command-input]:text-base **:data-[slot=command-input]:md:text-sm'>
								{isLoadingInviteCandidates ? (
									<div className='flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground'>
										<LoaderCircle className='h-4 w-4 animate-spin' />
										Loading users...
									</div>
								) : inviteOptions.length === 0 ? (
									<div className='py-6 text-center text-sm text-muted-foreground'>No eligible users found.</div>
								) : (
									<div className='**:data-[slot=command-group]:p-0 **:data-[slot=command-item]:pl-3 **:data-[slot=command-item]:pr-2 **:data-[slot=command-item]:cursor-pointer **:data-[slot=command-item]:items-center'>
										<VirtualizedCommand
											height={commandHeight}
											options={inviteOptions}
											placeholder='Search users...'
											selectedOption={selectedInviteeId}
											emptyMessage='No eligible users found.'
											rowHeight={56}
											onSelectOption={(currentValue) => {
												setSelectedInviteeId(currentValue === selectedInviteeId ? '' : currentValue)
												setUserDropdownOpen(false)
											}}
										/>
									</div>
								)}
							</div>
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
