'use client'

import { useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { Virtuoso } from 'react-virtuoso'
import {
	Bell,
	Search,
	Trash2,
	AtSign,
	UserPlus,
	RefreshCw,
	AlertCircle,
	CalendarIcon,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	X,
	Inbox as InboxIcon
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotifications, useMemberProfiles } from '@/lib/react-query/queries'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import type { Notification } from '@/lib/react-query/queries'
import type { DateRange } from 'react-day-picker'

// ─── Types ───────────────────────────────────────────────

type NotificationType = 'mention' | 'invite' | 'update' | 'alert'

type SortField = 'created_at' | 'type' | 'sender' | 'title'
type SortDirection = 'asc' | 'desc'

type NotificationWithProfile = Notification & {
	senderProfile: { id: string; full_name: string } | null
}

// ─── Constants ───────────────────────────────────────────

const ROW_HEIGHT = 76
const MAX_HEIGHT = 680

const typeIcons: Record<NotificationType, React.ElementType> = {
	mention: AtSign,
	invite: UserPlus,
	update: RefreshCw,
	alert: AlertCircle
}

const typeColors: Record<NotificationType, string> = {
	mention: 'text-chart-1',
	invite: 'text-chart-3',
	update: 'text-chart-4',
	alert: 'text-destructive'
}

const typeBadgeColors: Record<NotificationType, string> = {
	mention: 'bg-chart-1/10 text-chart-1 border-chart-1/20',
	invite: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
	update: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
	alert: 'bg-destructive/10 text-destructive border-destructive/20'
}

const typeLabels: Record<NotificationType, string> = {
	mention: 'Mention',
	invite: 'Invite',
	update: 'Update',
	alert: 'Alert'
}

// ─── Helpers ─────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
	const date = new Date(iso)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffMin = Math.floor(diffMs / 1000 / 60)
	const diffHour = Math.floor(diffMin / 60)
	const diffDay = Math.floor(diffHour / 24)

	if (diffMin < 1) return 'Just now'
	if (diffMin < 60) return `${diffMin}m ago`
	if (diffHour < 24) return `${diffHour}h ago`
	if (diffDay < 7) return `${diffDay}d ago`
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getInitials(fullName: string | undefined | null): string {
	if (!fullName) return '?'
	return fullName
		.split(' ')
		.map((w) => w[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}

// ─── SortableHeader ──────────────────────────────────────

function SortableHeader({
	label,
	field,
	currentSort,
	currentDirection,
	onSort
}: {
	label: string
	field: SortField
	currentSort: SortField
	currentDirection: SortDirection
	onSort: (field: SortField) => void
}) {
	const isActive = currentSort === field
	const Icon = isActive ? (currentDirection === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown

	return (
		<button
			onClick={() => onSort(field)}
			className={cn(
				'flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide transition-colors hover:text-foreground',
				isActive ? 'text-foreground' : 'text-muted-foreground'
			)}
		>
			{label}
			<Icon className='size-3' />
		</button>
	)
}

// ─── InboxNotificationRow ────────────────────────────────

function InboxNotificationRow({
	notification,
	isSelected,
	onSelect,
	onDelete,
	onView
}: {
	notification: NotificationWithProfile
	isSelected: boolean
	onSelect: (id: string, checked: boolean) => void
	onDelete: (notification: NotificationWithProfile) => void
	onView: (id: string) => void
}) {
	const Icon = typeIcons[notification.type as NotificationType] ?? Bell
	const senderName = notification.senderProfile?.full_name ?? 'Unknown'
	const initials = getInitials(notification.senderProfile?.full_name)
	const typeBadge = typeBadgeColors[notification.type as NotificationType]
	const typeLabel = typeLabels[notification.type as NotificationType] ?? notification.type

	const handleRowClick = () => {
		if (!notification.viewed) {
			onView(notification.id as string)
		}
	}

	return (
		<div
			onClick={handleRowClick}
			className={cn(
				'group flex items-center gap-4 rounded-lg px-4 py-3 transition-colors cursor-pointer',
				!notification.viewed && 'bg-accent/50',
				isSelected && 'bg-accent',
				notification.viewed && !isSelected && 'hover:bg-accent/30'
			)}
		>
			<Checkbox
				checked={isSelected}
				onCheckedChange={(checked) => onSelect(notification.id as string, !!checked)}
				onClick={(e) => e.stopPropagation()}
				aria-label={`Select notification from ${senderName}`}
			/>

			<div className='relative shrink-0'>
				<Avatar className='size-9'>
					<AvatarFallback className='bg-muted text-muted-foreground text-xs font-medium'>{initials}</AvatarFallback>
				</Avatar>
				<div className='absolute -bottom-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-background border'>
					<Icon
						className={cn('size-3', typeColors[notification.type as NotificationType] ?? 'text-muted-foreground')}
					/>
				</div>
			</div>

			<div className='min-w-0 flex-1'>
				<div className='flex items-center gap-2'>
					<span className='truncate text-sm font-medium text-foreground'>{senderName}</span>
					<Badge variant='outline' className={cn('text-[10px] px-1.5 py-0 shrink-0', typeBadge)}>
						{typeLabel}
					</Badge>
					{!notification.viewed && <span className='size-2 shrink-0 rounded-full bg-primary' />}
				</div>
				{notification.href ? (
					<Link href={notification.href} className='hover:underline' onClick={(e) => e.stopPropagation()}>
						<p className='mt-0.5 truncate text-sm leading-snug text-muted-foreground'>{notification.title}</p>
					</Link>
				) : (
					<p className='mt-0.5 truncate text-sm leading-snug text-muted-foreground'>{notification.title}</p>
				)}
				<p className='mt-0.5 truncate text-xs leading-snug text-muted-foreground/70'>{notification.description}</p>
			</div>

			<div className='flex shrink-0 items-center gap-2'>
				<span className='text-xs text-muted-foreground whitespace-nowrap'>
					{formatRelativeTime(notification.created_at)}
				</span>
				<TooltipProvider delayDuration={300}>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant='ghost'
								size='icon'
								className='size-8 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive'
								onClick={(e) => {
									e.stopPropagation()
									onDelete(notification)
								}}
								aria-label='Delete notification'
							>
								<Trash2 className='size-4' />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Delete notification</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		</div>
	)
}

// ─── InboxPage (main export) ─────────────────────────────

export function InboxPage() {
	const { data: user } = useCurrentClientUser()
	const { data, isLoading } = useNotifications(user?.id ?? '')
	const notifications: Notification[] = data ?? []
	const queryClient = useQueryClient()

	// Gather sender profiles
	const involvedUserIds = useMemo(() => {
		const ids = new Set<string>()
		notifications.forEach((n) => {
			if (n.sender_id) ids.add(n.sender_id)
			if (n.recipient_id) ids.add(n.recipient_id)
		})
		return Array.from(ids)
	}, [notifications])

	const { data: profiles } = useMemberProfiles(involvedUserIds)

	const profileMap = useMemo(() => {
		const map = new Map<string, { id: string; full_name: string }>()
		profiles?.forEach((p) => map.set(p.id, p))
		return map
	}, [profiles])

	const notificationsWithProfiles: NotificationWithProfile[] = useMemo(() => {
		return notifications.map((n) => ({
			...n,
			senderProfile: profileMap.get(n.sender_id) ?? null
		}))
	}, [notifications, profileMap])

	// Unique senders for filter dropdown
	const uniqueSenders = useMemo(() => {
		const senders = new Map<string, string>()
		notificationsWithProfiles.forEach((n) => {
			if (n.sender_id && n.senderProfile) {
				senders.set(n.sender_id, n.senderProfile.full_name)
			}
		})
		return Array.from(senders.entries()).map(([id, name]) => ({ id, name }))
	}, [notificationsWithProfiles])

	// Unique types for filter dropdown
	const uniqueTypes = useMemo(() => {
		const types = new Set<string>()
		notifications.forEach((n) => types.add(n.type))
		return Array.from(types)
	}, [notifications])

	// ─── Filter / search / sort state ──────────────────
	const [searchQuery, setSearchQuery] = useState('')
	const [typeFilter, setTypeFilter] = useState<string>('all')
	const [senderFilter, setSenderFilter] = useState<string>('all')
	const [viewedFilter, setViewedFilter] = useState<string>('all')
	const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
	const [sortField, setSortField] = useState<SortField>('created_at')
	const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

	// ─── Selection state ───────────────────────────────
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
	const [deleteTarget, setDeleteTarget] = useState<NotificationWithProfile | null>(null)
	const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)

	// ─── Virtuoso height state ─────────────────────────
	const [dynamicHeight, setDynamicHeight] = useState<number>(MAX_HEIGHT)

	const handleTotalListHeightChanged = useCallback((height: number) => {
		setDynamicHeight(Math.min(height + 8, MAX_HEIGHT))
	}, [])

	// ─── Handlers ──────────────────────────────────────

	const handleSort = useCallback(
		(field: SortField) => {
			if (sortField === field) {
				setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
			} else {
				setSortField(field)
				setSortDirection('asc')
			}
		},
		[sortField]
	)

	const handleSelect = useCallback((id: string, checked: boolean) => {
		setSelectedIds((prev) => {
			const next = new Set(prev)
			if (checked) {
				next.add(id)
			} else {
				next.delete(id)
			}
			return next
		})
	}, [])

	const markAsViewed = useCallback(
		async (notificationId: string) => {
			if (!user?.id) return
			const supabase = createClient()
			const { error } = await supabase
				.from('notifications')
				.update({ viewed: true, viewed_at: new Date().toISOString() })
				.eq('id', notificationId)
			if (error) {
				console.error('Failed to mark notification as viewed:', error)
				return
			}
			await queryClient.invalidateQueries({ queryKey: ['notifications', user.id] })
		},
		[user?.id, queryClient]
	)

	const deleteNotification = useCallback(async (id: string) => {
		const supabase = createClient()
		const { error } = await supabase.from('notifications').delete().eq('id', id)
		if (error) throw error
	}, [])

	const handleDeleteSingle = useCallback((notification: NotificationWithProfile) => {
		setDeleteTarget(notification)
	}, [])

	const confirmDeleteSingle = useCallback(async () => {
		if (!deleteTarget || !user?.id) return
		setIsDeleting(true)
		try {
			await deleteNotification(deleteTarget.id as string)
			await queryClient.invalidateQueries({ queryKey: ['notifications', user.id] })
			setSelectedIds((prev) => {
				const next = new Set(prev)
				next.delete(deleteTarget.id as string)
				return next
			})
		} catch (e) {
			console.error('Failed to delete notification:', e)
		} finally {
			setIsDeleting(false)
			setDeleteTarget(null)
		}
	}, [deleteTarget, deleteNotification, queryClient, user?.id])

	const confirmBulkDelete = useCallback(async () => {
		if (selectedIds.size === 0 || !user?.id) return
		setIsDeleting(true)
		try {
			const supabase = createClient()
			const { error } = await supabase.from('notifications').delete().in('id', Array.from(selectedIds))
			if (error) throw error
			await queryClient.invalidateQueries({ queryKey: ['notifications', user.id] })
			setSelectedIds(new Set())
		} catch (e) {
			console.error('Failed to bulk delete notifications:', e)
		} finally {
			setIsDeleting(false)
			setBulkDeleteOpen(false)
		}
	}, [selectedIds, queryClient, user?.id])

	const clearFilters = useCallback(() => {
		setSearchQuery('')
		setTypeFilter('all')
		setSenderFilter('all')
		setViewedFilter('all')
		setDateRange(undefined)
	}, [])

	const hasActiveFilters =
		searchQuery || typeFilter !== 'all' || senderFilter !== 'all' || viewedFilter !== 'all' || dateRange

	// ─── Filtering ─────────────────────────────────────

	const filteredNotifications = useMemo(() => {
		let result = notificationsWithProfiles

		if (searchQuery) {
			const q = searchQuery.toLowerCase()
			result = result.filter(
				(n) =>
					n.title.toLowerCase().includes(q) ||
					n.description.toLowerCase().includes(q) ||
					(n.senderProfile?.full_name ?? '').toLowerCase().includes(q)
			)
		}

		if (typeFilter !== 'all') {
			result = result.filter((n) => n.type === typeFilter)
		}

		if (senderFilter !== 'all') {
			result = result.filter((n) => n.sender_id === senderFilter)
		}

		if (viewedFilter === 'unread') {
			result = result.filter((n) => !n.viewed)
		} else if (viewedFilter === 'read') {
			result = result.filter((n) => n.viewed)
		}

		if (dateRange?.from) {
			const from = new Date(dateRange.from)
			from.setHours(0, 0, 0, 0)
			result = result.filter((n) => new Date(n.created_at) >= from)
		}
		if (dateRange?.to) {
			const to = new Date(dateRange.to)
			to.setHours(23, 59, 59, 999)
			result = result.filter((n) => new Date(n.created_at) <= to)
		}

		result = [...result].sort((a, b) => {
			let cmp = 0
			switch (sortField) {
				case 'created_at':
					cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
					break
				case 'type':
					cmp = a.type.localeCompare(b.type)
					break
				case 'sender':
					cmp = (a.senderProfile?.full_name ?? '').localeCompare(b.senderProfile?.full_name ?? '')
					break
				case 'title':
					cmp = a.title.localeCompare(b.title)
					break
			}
			return sortDirection === 'asc' ? cmp : -cmp
		})

		return result
	}, [
		notificationsWithProfiles,
		searchQuery,
		typeFilter,
		senderFilter,
		viewedFilter,
		dateRange,
		sortField,
		sortDirection
	])

	const allSelected =
		filteredNotifications.length > 0 && filteredNotifications.every((n) => selectedIds.has(n.id as string))
	const someSelected = filteredNotifications.some((n) => selectedIds.has(n.id as string))

	const handleSelectAll = useCallback(
		(checked: boolean) => {
			if (checked) {
				setSelectedIds(new Set(filteredNotifications.map((n) => n.id as string)))
			} else {
				setSelectedIds(new Set())
			}
		},
		[filteredNotifications]
	)

	// Compute virtuoso container height
	const containerHeight = useMemo(() => {
		if (filteredNotifications.length === 0) return 0
		const calculated = filteredNotifications.length * ROW_HEIGHT
		return Math.min(calculated, MAX_HEIGHT)
	}, [filteredNotifications.length])

	// ─── Render ────────────────────────────────────────

	return (
		<div className='w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl'>
				{/* Page header */}
				<div className='pb-5'>
					<h1 className='text-2xl font-semibold'>Inbox</h1>
					<p className='text-sm text-muted-foreground mt-1'>
						{filteredNotifications.length === notifications.length
							? `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`
							: `${filteredNotifications.length} of ${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}
					</p>
				</div>

				<div className='flex flex-col gap-6'>
					{/* ── Filters section ────────────────────── */}
					<section className='space-y-3'>
						<h2 className='text-lg font-semibold'>Filters</h2>
						<div className='flex flex-wrap items-end gap-3'>
							{/* Search */}
							<div className='relative flex-1 min-w-[200px] max-w-sm'>
								<Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
								<Input
									placeholder='Search notifications...'
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className='pl-9'
								/>
							</div>

							{/* Type filter */}
							<Select value={typeFilter} onValueChange={(v) => setTypeFilter(v)}>
								<SelectTrigger className='w-[140px]'>
									<SelectValue placeholder='Type' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>All types</SelectItem>
									{uniqueTypes.map((type) => (
										<SelectItem key={type} value={type}>
											<span className='flex items-center gap-2'>
												{(() => {
													const TypeIcon = typeIcons[type as NotificationType] ?? Bell
													return (
														<TypeIcon
															className={cn(
																'size-3.5',
																typeColors[type as NotificationType] ?? 'text-muted-foreground'
															)}
														/>
													)
												})()}
												{typeLabels[type as NotificationType] ?? type}
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{/* Sender filter */}
							<Select value={senderFilter} onValueChange={(v) => setSenderFilter(v)}>
								<SelectTrigger className='w-[160px]'>
									<SelectValue placeholder='Sender' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>All senders</SelectItem>
									{uniqueSenders.map((s) => (
										<SelectItem key={s.id} value={s.id}>
											{s.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{/* Read/Unread filter */}
							<Select value={viewedFilter} onValueChange={(v) => setViewedFilter(v)}>
								<SelectTrigger className='w-[130px]'>
									<SelectValue placeholder='Status' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>All</SelectItem>
									<SelectItem value='unread'>Unread</SelectItem>
									<SelectItem value='read'>Read</SelectItem>
								</SelectContent>
							</Select>

							{/* Date range filter */}
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant='outline'
										className={cn(
											'w-[200px] justify-start text-left font-normal',
											!dateRange && 'text-muted-foreground'
										)}
									>
										<CalendarIcon className='mr-2 size-4' />
										{dateRange?.from ? (
											dateRange.to ? (
												<>
													{format(dateRange.from, 'LLL dd')} - {format(dateRange.to, 'LLL dd')}
												</>
											) : (
												format(dateRange.from, 'LLL dd, yyyy')
											)
										) : (
											<span>Date range</span>
										)}
									</Button>
								</PopoverTrigger>
								<PopoverContent className='w-auto p-0' align='start'>
									<Calendar
										mode='range'
										selected={dateRange}
										onSelect={(range) => setDateRange(range)}
										numberOfMonths={2}
									/>
								</PopoverContent>
							</Popover>

							{/* Clear filters */}
							{hasActiveFilters && (
								<Button variant='ghost' size='sm' onClick={clearFilters} className='text-muted-foreground'>
									<X className='mr-1 size-3.5' />
									Clear filters
								</Button>
							)}
						</div>
					</section>

					{/* ── Notifications section ──────────────── */}
					<section className='space-y-3'>
						<h2 className='text-lg font-semibold'>Notifications</h2>

						{/* Bulk actions bar */}
						{selectedIds.size > 0 && (
							<div className='flex items-center gap-3 rounded-lg bg-accent/50 px-4 py-2'>
								<span className='text-sm font-medium'>{selectedIds.size} selected</span>
								<Separator orientation='vertical' className='h-5' />
								<Button
									variant='ghost'
									size='sm'
									className='text-destructive hover:text-destructive hover:bg-destructive/10'
									onClick={() => setBulkDeleteOpen(true)}
								>
									<Trash2 className='mr-1.5 size-3.5' />
									Delete selected
								</Button>
								<Button
									variant='ghost'
									size='sm'
									className='text-muted-foreground'
									onClick={() => setSelectedIds(new Set())}
								>
									Clear selection
								</Button>
							</div>
						)}

						{/* Sort header + select all */}
						<div className='flex items-center gap-4 rounded-lg bg-muted/50 px-4 py-2'>
							<Checkbox
								checked={allSelected}
								ref={(el) => {
									if (el) {
										const input = el as unknown as HTMLButtonElement
										if (someSelected && !allSelected) {
											input.dataset.state = 'indeterminate'
										}
									}
								}}
								onCheckedChange={(checked) => handleSelectAll(!!checked)}
								aria-label='Select all notifications'
							/>
							<div className='flex flex-1 items-center gap-6'>
								<SortableHeader
									label='Date'
									field='created_at'
									currentSort={sortField}
									currentDirection={sortDirection}
									onSort={handleSort}
								/>
								<SortableHeader
									label='Sender'
									field='sender'
									currentSort={sortField}
									currentDirection={sortDirection}
									onSort={handleSort}
								/>
								<SortableHeader
									label='Type'
									field='type'
									currentSort={sortField}
									currentDirection={sortDirection}
									onSort={handleSort}
								/>
								<SortableHeader
									label='Title'
									field='title'
									currentSort={sortField}
									currentDirection={sortDirection}
									onSort={handleSort}
								/>
							</div>
						</div>

						{/* Notification list with Virtuoso */}
						{isLoading ? (
							<div className='rounded-lg border bg-card p-2 space-y-2'>
								{[...Array(6)].map((_, i) => (
									<div key={i} className='rounded-lg p-3'>
										<div className='flex items-center gap-4'>
											<Skeleton className='size-4 rounded' />
											<Skeleton className='size-9 rounded-full shrink-0' />
											<div className='flex-1 space-y-2'>
												<div className='flex items-center gap-2'>
													<Skeleton className='h-4 w-24' />
													<Skeleton className='h-4 w-14' />
												</div>
												<Skeleton className='h-3.5 w-48' />
												<Skeleton className='h-3 w-64' />
											</div>
											<Skeleton className='h-3.5 w-12' />
										</div>
									</div>
								))}
							</div>
						) : filteredNotifications.length > 0 ? (
							<div className='rounded-lg border bg-card'>
								<Virtuoso
									style={{
										height: `${dynamicHeight || containerHeight}px`,
										transition: 'height 0.2s ease-in-out'
									}}
									data={filteredNotifications}
									increaseViewportBy={200}
									totalListHeightChanged={handleTotalListHeightChanged}
									itemContent={(_, notification) => (
										<div className='px-1 pb-0 last:pb-1'>
											<InboxNotificationRow
												notification={notification}
												isSelected={selectedIds.has(notification.id as string)}
												onSelect={handleSelect}
												onDelete={handleDeleteSingle}
												onView={markAsViewed}
											/>
										</div>
									)}
								/>
							</div>
						) : (
							<div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center'>
								<div className='flex size-14 items-center justify-center rounded-full bg-muted'>
									<InboxIcon className='size-7 text-muted-foreground' />
								</div>
								<p className='mt-4 text-sm font-medium text-foreground'>
									{hasActiveFilters ? 'No matching notifications' : 'Your inbox is empty'}
								</p>
								<p className='mt-1 text-sm text-muted-foreground'>
									{hasActiveFilters
										? 'Try adjusting your filters or search query.'
										: "You're all caught up! New notifications will appear here."}
								</p>
								{hasActiveFilters && (
									<Button variant='outline' size='sm' className='mt-4' onClick={clearFilters}>
										Clear all filters
									</Button>
								)}
							</div>
						)}
					</section>
				</div>
			</div>

			{/* Single delete confirmation */}
			<AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete notification</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this notification from{' '}
							<span className='font-medium text-foreground'>{deleteTarget?.senderProfile?.full_name ?? 'Unknown'}</span>
							? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDeleteSingle}
							disabled={isDeleting}
							className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
						>
							{isDeleting ? 'Deleting...' : 'Delete'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Bulk delete confirmation */}
			<AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Delete {selectedIds.size} notification{selectedIds.size !== 1 ? 's' : ''}
						</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete {selectedIds.size} selected notification
							{selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmBulkDelete}
							disabled={isDeleting}
							className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
						>
							{isDeleting
								? 'Deleting...'
								: `Delete ${selectedIds.size} notification${selectedIds.size !== 1 ? 's' : ''}`}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
