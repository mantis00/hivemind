'use client'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlusIcon, LoaderCircle } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { useInviteMember } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useParams } from 'next/navigation'
import { UUID } from 'crypto'
import { AllProfile, useAllProfiles, useIsOwnerOrSuperadmin, useOrgMembers } from '@/lib/react-query/queries'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableVirtuoso, type TableComponents } from 'react-virtuoso'
import { useIsMobile } from '@/hooks/use-mobile'

const tableComponents: TableComponents<AllProfile> = {
	Table: ({ style, ...props }) => (
		<table style={style} className='w-full table-fixed caption-bottom text-sm' {...props} />
	),
	TableHead: React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
		function TableHeadWrapper(props, ref) {
			return <TableHeader ref={ref} className='sticky top-0 z-10 bg-card [&_tr]:border-b' {...props} />
		}
	),
	TableRow: (props: { item: AllProfile } & React.HTMLAttributes<HTMLTableRowElement>) => <TableRow {...props} />,
	TableBody: React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
		function TableBodyWrapper(props, ref) {
			return <TableBody ref={ref} {...props} />
		}
	)
}

const HEADER_HEIGHT = 40
const FALLBACK_ROW_HEIGHT = 39
const MAX_HEIGHT = 5 * FALLBACK_ROW_HEIGHT + HEADER_HEIGHT

export function InviteMemberButton() {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const [open, setOpen] = useState(false)
	const [userDropdownOpen, setUserDropdownOpen] = useState(false)
	const [userSearch, setUserSearch] = useState('')
	const [selectedInviteeId, setSelectedInviteeId] = useState<string>('')
	const [listHeight, setListHeight] = useState(FALLBACK_ROW_HEIGHT)
	const [accessLvl, setAccessLvl] = useState('1')
	const { data: user } = useCurrentClientUser()
	const isMobile = useIsMobile()
	const inviteMutation = useInviteMember()
	const isOwnerOrSuperadmin = useIsOwnerOrSuperadmin(orgId)
	const { data: profiles, isLoading: isLoadingProfiles } = useAllProfiles()
	const { data: orgMembers, isLoading: isLoadingOrgMembers } = useOrgMembers(orgId as UUID)

	// Filter out users who are already members of the organization
	const inviteCandidates = useMemo(() => {
		const memberIds = new Set((orgMembers ?? []).map((member) => member.user_id))
		return (profiles ?? []).filter((profile) => {
			return !memberIds.has(String(profile.id))
		})
	}, [orgMembers, profiles])

	const filteredInviteCandidates = useMemo(() => {
		const normalizedSearch = userSearch.trim().toLowerCase()
		if (!normalizedSearch) return inviteCandidates ?? []

		return (inviteCandidates ?? []).filter((candidate) => {
			const firstName = candidate.first_name?.toLowerCase() ?? ''
			const lastName = candidate.last_name?.toLowerCase() ?? ''
			const fullName = candidate.full_name?.toLowerCase() ?? ''
			return (
				firstName.includes(normalizedSearch) ||
				lastName.includes(normalizedSearch) ||
				fullName.includes(normalizedSearch)
			)
		})
	}, [inviteCandidates, userSearch])

	const selectedInvitee = inviteCandidates.find((candidate) => String(candidate.id) === selectedInviteeId)
	const isLoadingInviteCandidates = isLoadingProfiles || isLoadingOrgMembers
	const dropdownHeight =
		isLoadingInviteCandidates || filteredInviteCandidates.length === 0
			? 120
			: Math.min(listHeight + HEADER_HEIGHT, isMobile ? 4 * FALLBACK_ROW_HEIGHT + HEADER_HEIGHT : MAX_HEIGHT)

	if (!isOwnerOrSuperadmin) return null

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!user?.id || !selectedInviteeId || !selectedInvitee?.email) return

		inviteMutation.mutate(
			{
				orgId: orgId as UUID,
				inviterId: user.id,
				inviteeId: selectedInviteeId,
				inviteeEmail: selectedInvitee.email,
				accessLvl: Number(accessLvl)
			},
			{
				onSuccess: () => {
					setSelectedInviteeId('')
					setUserSearch('')
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
			onOpenChange={(isOpen) => setOpen(isOpen)}
		>
			<form onSubmit={handleSubmit}>
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
								style={{
									maxHeight: 'min(60vh, var(--radix-popover-content-available-height))',
									maxWidth: 'min(100vw - 1rem, var(--radix-popover-content-available-width))'
								}}
								className={
									isMobile
										? 'w-[calc(100vw-2rem)] p-2 overflow-hidden'
										: 'w-(--radix-popover-trigger-width) p-2 overflow-hidden'
								}
								align='start'
								side='bottom'
							>
								<div className='grid gap-2'>
									<Input
										placeholder='Search by first or last name'
										value={userSearch}
										onChange={(event) => setUserSearch(event.target.value)}
										disabled={inviteMutation.isPending}
									/>
									<div className='rounded-md border'>
										{isLoadingInviteCandidates ? (
											<div className='flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground'>
												<LoaderCircle className='h-4 w-4 animate-spin' />
												Loading users...
											</div>
										) : filteredInviteCandidates.length === 0 ? (
											<div className='py-6 text-center text-sm text-muted-foreground'>No eligible users found.</div>
										) : (
											<TableVirtuoso<AllProfile>
												style={{ height: dropdownHeight }}
												data={filteredInviteCandidates}
												components={tableComponents}
												totalListHeightChanged={setListHeight}
												fixedHeaderContent={() => (
													<TableRow className='hover:bg-transparent select-none'>
														<TableHead className='w-1/2 select-none'>Name</TableHead>
														<TableHead className='w-1/2 select-none'>Email</TableHead>
													</TableRow>
												)}
												itemContent={(index, candidate) =>
													(() => {
														const isSelected = selectedInviteeId === String(candidate.id)
														const rowClass = isSelected ? 'bg-accent/60' : ''

														const handleSelect = () => {
															setSelectedInviteeId(String(candidate.id))
															setUserDropdownOpen(false)
														}

														return (
															<>
																<TableCell
																	className={`cursor-pointer overflow-hidden ${rowClass}`}
																	onClick={handleSelect}
																>
																	<div className='min-w-0'>
																		<p className='truncate font-medium' title={candidate.full_name || undefined}>
																			{candidate.full_name || '—'}
																		</p>
																	</div>
																</TableCell>
																<TableCell
																	className={`cursor-pointer overflow-hidden ${rowClass}`}
																	onClick={handleSelect}
																>
																	<div className='min-w-0'>
																		<p className='truncate font-medium' title={candidate.email || undefined}>
																			{candidate.email || '—'}
																		</p>
																	</div>
																</TableCell>
															</>
														)
													})()
												}
											/>
										)}
									</div>
								</div>
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
