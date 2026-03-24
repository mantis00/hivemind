'use client'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Label } from '@/components/ui/label'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { UserPlusIcon, LoaderCircle, Check } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { useInviteMember } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useParams } from 'next/navigation'
import { UUID } from 'crypto'
import { useAllProfiles, useIsOwnerOrSuperadmin, useOrgMembers } from '@/lib/react-query/queries'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/utils'

type InviteOption = {
	value: string
	label: string
	email: string
}

interface VirtualizedInviteCommandProps {
	height: string
	options: InviteOption[]
	placeholder: string
	selectedOption: string
	onSelectOption?: (option: string) => void
}

const FALLBACK_ROW_HEIGHT = 44

const VirtualizedInviteCommand = ({
	height,
	options,
	placeholder,
	selectedOption,
	onSelectOption
}: VirtualizedInviteCommandProps) => {
	const [filteredOptions, setFilteredOptions] = React.useState<InviteOption[]>(options)
	const [focusedIndex, setFocusedIndex] = React.useState(-1)
	const [hoveredIndex, setHoveredIndex] = React.useState(-1)
	const [isKeyboardNavActive, setIsKeyboardNavActive] = React.useState(false)

	const parentRef = React.useRef<HTMLDivElement | null>(null)

	const virtualizer = useVirtualizer({
		count: filteredOptions.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => FALLBACK_ROW_HEIGHT,
		overscan: 6
	})

	const virtualOptions = virtualizer.getVirtualItems()

	const scrollToIndex = (index: number) => {
		virtualizer.scrollToIndex(index, {
			align: 'center'
		})
	}

	const handleSearch = (search: string) => {
		setIsKeyboardNavActive(false)
		setHoveredIndex(-1)
		const normalizedSearch = search.trim().toLowerCase()
		if (!normalizedSearch) {
			setFilteredOptions(options)
			return
		}

		setFilteredOptions(
			options.filter((option) => {
				const label = option.label.toLowerCase()
				const email = option.email.toLowerCase()
				return label.includes(normalizedSearch) || email.includes(normalizedSearch)
			})
		)
	}

	const handleKeyDown = (event: React.KeyboardEvent) => {
		switch (event.key) {
			case 'ArrowDown': {
				event.preventDefault()
				setIsKeyboardNavActive(true)
				setFocusedIndex((prev) => {
					const newIndex = prev === -1 ? 0 : Math.min(prev + 1, filteredOptions.length - 1)
					scrollToIndex(newIndex)
					return newIndex
				})
				break
			}
			case 'ArrowUp': {
				event.preventDefault()
				setIsKeyboardNavActive(true)
				setFocusedIndex((prev) => {
					const newIndex = prev === -1 ? filteredOptions.length - 1 : Math.max(prev - 1, 0)
					scrollToIndex(newIndex)
					return newIndex
				})
				break
			}
			case 'Enter': {
				event.preventDefault()
				if (filteredOptions[focusedIndex]) {
					onSelectOption?.(filteredOptions[focusedIndex].value)
				}
				break
			}
			default:
				break
		}
	}

	useEffect(() => {
		setFilteredOptions(options)
		if (!selectedOption) {
			setFocusedIndex(-1)
			return
		}

		const selectedIndex = options.findIndex((entry) => entry.value === selectedOption)
		setFocusedIndex(selectedIndex >= 0 ? selectedIndex : -1)
	}, [options, selectedOption])

	useEffect(() => {
		if (selectedOption) {
			const option = filteredOptions.find((entry) => entry.value === selectedOption)
			if (option) {
				const index = filteredOptions.indexOf(option)
				setFocusedIndex(index)
				virtualizer.scrollToIndex(index, {
					align: 'center'
				})
			}
		}
	}, [selectedOption, filteredOptions, virtualizer])

	return (
		<Command shouldFilter={false} onKeyDown={handleKeyDown}>
			<CommandInput onValueChange={handleSearch} placeholder={placeholder} />
			<CommandList
				ref={parentRef}
				style={{
					height,
					width: '100%',
					overflow: 'auto'
				}}
				onMouseDown={() => {
					setIsKeyboardNavActive(false)
					setHoveredIndex(-1)
				}}
				onMouseMove={() => setIsKeyboardNavActive(false)}
				onMouseLeave={() => setHoveredIndex(-1)}
			>
				<CommandEmpty>No eligible users found.</CommandEmpty>
				<CommandGroup>
					<div
						style={{
							height: `${virtualizer.getTotalSize()}px`,
							width: '100%',
							position: 'relative'
						}}
					>
						{virtualOptions.map((virtualOption) => {
							const option = filteredOptions[virtualOption.index]
							if (!option) return null

							return (() => {
								const isHighlighted = isKeyboardNavActive
									? focusedIndex === virtualOption.index
									: hoveredIndex === virtualOption.index

								return (
									<CommandItem
										key={option.value}
										disabled={isKeyboardNavActive}
										className={cn(
											'absolute left-0 top-0 w-full bg-transparent data-[selected=true]:bg-transparent data-[selected=true]:text-foreground aria-selected:bg-transparent aria-selected:text-foreground',
											isHighlighted && 'bg-accent! text-accent-foreground!',
											isKeyboardNavActive &&
												focusedIndex !== virtualOption.index &&
												'aria-selected:bg-transparent aria-selected:text-primary'
										)}
										style={{
											height: `${virtualOption.size}px`,
											transform: `translateY(${virtualOption.start}px)`
										}}
										value={option.value}
										onMouseEnter={() => !isKeyboardNavActive && setHoveredIndex(virtualOption.index)}
										onMouseLeave={() => !isKeyboardNavActive && setHoveredIndex(-1)}
										onSelect={onSelectOption}
									>
										<Check
											className={cn('mr-2 h-4 w-4', selectedOption === option.value ? 'opacity-100' : 'opacity-0')}
										/>
										<div className='flex min-w-0 flex-col'>
											<span className='truncate'>{option.label || '—'}</span>
											<span className='truncate text-xs text-muted-foreground'>{option.email || '—'}</span>
										</div>
									</CommandItem>
								)
							})()
						})}
					</div>
				</CommandGroup>
			</CommandList>
		</Command>
	)
}

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
	const inviteOptions = useMemo<InviteOption[]>(
		() =>
			(inviteCandidates ?? []).map((candidate) => ({
				value: String(candidate.id),
				label: candidate.full_name || '',
				email: candidate.email || ''
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
									<VirtualizedInviteCommand
										height={commandHeight}
										options={inviteOptions}
										placeholder='Search users...'
										selectedOption={selectedInviteeId}
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
