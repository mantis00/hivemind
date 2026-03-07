'use client'

import { useMemo, useState, useCallback } from 'react'
import { useNotifications } from '@/lib/react-query/queries'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import type { Notification } from '@/lib/react-query/queries'
import type { DateRange } from 'react-day-picker'
import type { NotificationWithProfile } from '@/context/notifications-with-profiles'
import { useNotificationsWithProfiles } from '@/context/notifications-with-profiles'
import { useDeleteNotification, useMarkNotificationAsViewed } from '@/lib/react-query/mutations'
import { InboxFilters } from '@/components/notification/inbox-filters'
import { InboxList, type SortField, type SortDirection } from '@/components/notification/inbox-list'
import { InboxDeleteDialogs } from '@/components/notification/inbox-delete-button'

// ─── InboxPage (main export) ─────────────────────────────

export function InboxPage() {
	const { data: user } = useCurrentClientUser()

	const { data, isLoading } = useNotifications(user?.id ?? '')
	const notifications: Notification[] = data ?? []

	const notificationsWithProfiles = useNotificationsWithProfiles(notifications)

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
	const [singleDeleteOpen, setSingleDeleteOpen] = useState(false)

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

	const markAsViewedMutation = useMarkNotificationAsViewed(user?.id)
	const deleteNotificationMutation = useDeleteNotification(user?.id)

	const handleDeleteSingle = useCallback((notification: NotificationWithProfile) => {
		setDeleteTarget(notification)
		setSingleDeleteOpen(true)
	}, [])

	const confirmDeleteSingle = useCallback(() => {
		if (!deleteTarget) return

		setIsDeleting(true)

		deleteNotificationMutation.mutate(deleteTarget.id as string, {
			onSuccess: () => {
				setSelectedIds((prev) => {
					const next = new Set(prev)
					next.delete(deleteTarget.id as string)
					return next
				})
				setDeleteTarget(null)
				setIsDeleting(false)
				setSingleDeleteOpen(false)
			},
			onError: (e) => {
				console.error('Failed to delete notification:', e)
				setIsDeleting(false)
			}
		})
	}, [deleteTarget, deleteNotificationMutation, setSingleDeleteOpen])

	const confirmBulkDelete = useCallback(() => {
		if (selectedIds.size === 0) return

		setIsDeleting(true)

		const ids = Array.from(selectedIds)

		Promise.all(ids.map((id) => deleteNotificationMutation.mutateAsync(id)))
			.then(() => {
				setSelectedIds(new Set())
				setBulkDeleteOpen(false)
			})
			.catch((e) => {
				console.error('Bulk delete failed:', e)
			})
			.finally(() => {
				setIsDeleting(false)
			})
	}, [selectedIds, deleteNotificationMutation])

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

	// ─── Render ────────────────────────────────────────

	return (
		<div className='w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl'>
				{/* Page header */}
				<div className='pb-5'>
					<h1 className='text-2xl font-semibold'>
						{user?.user_metadata?.first_name
							? `${user.user_metadata.first_name}${
									user.user_metadata.last_name ? ` ${user.user_metadata.last_name}` : ''
								}'s Inbox`
							: 'Inbox'}
					</h1>
					<p className='text-sm text-muted-foreground mt-1'>
						{filteredNotifications.length === notifications.length
							? `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`
							: `${filteredNotifications.length} of ${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}
					</p>
				</div>

				<div className='flex flex-col gap-6'>
					<InboxFilters
						searchQuery={searchQuery}
						setSearchQuery={setSearchQuery}
						typeFilter={typeFilter}
						setTypeFilter={setTypeFilter}
						senderFilter={senderFilter}
						setSenderFilter={setSenderFilter}
						viewedFilter={viewedFilter}
						setViewedFilter={setViewedFilter}
						dateRange={dateRange}
						setDateRange={setDateRange}
						uniqueTypes={uniqueTypes}
						uniqueSenders={uniqueSenders}
						hasActiveFilters={!!hasActiveFilters}
						clearFilters={clearFilters}
					/>

					<InboxList
						filteredNotifications={filteredNotifications}
						isLoading={isLoading}
						sortField={sortField}
						sortDirection={sortDirection}
						onSort={handleSort}
						selectedIds={selectedIds}
						onSelectAll={handleSelectAll}
						onSelect={handleSelect}
						onDeleteSingle={handleDeleteSingle}
						onView={(id: string) => markAsViewedMutation.mutate(id)}
						onBulkDeleteClick={() => setBulkDeleteOpen(true)}
						hasActiveFilters={!!hasActiveFilters}
						clearFilters={clearFilters}
					/>
				</div>
			</div>

			<InboxDeleteDialogs
				deleteTarget={deleteTarget}
				singleDeleteOpen={singleDeleteOpen}
				setSingleDeleteOpen={setSingleDeleteOpen}
				onConfirmDeleteSingle={confirmDeleteSingle}
				setDeleteTarget={setDeleteTarget}
				selectedCount={selectedIds.size}
				bulkDeleteOpen={bulkDeleteOpen}
				setBulkDeleteOpen={setBulkDeleteOpen}
				onConfirmBulkDelete={confirmBulkDelete}
				isDeleting={isDeleting}
			/>
		</div>
	)
}
