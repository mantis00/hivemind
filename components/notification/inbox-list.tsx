import { useState, useMemo, useCallback } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { ArrowUpDown, ArrowUp, ArrowDown, Trash2, Inbox as InboxIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import type { NotificationWithProfile } from '@/context/notifications-with-profiles'
import { NotificationRow } from '@/components/notification/notification-row'

// ─── Types ───────────────────────────────────────────────

export type SortField = 'created_at' | 'type' | 'sender' | 'title'
export type SortDirection = 'asc' | 'desc'

// ─── Constants ───────────────────────────────────────────

const ROW_HEIGHT = 76
const MAX_HEIGHT = 680

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

// ─── InboxList ─────────────────────────────

interface InboxListProps {
	filteredNotifications: NotificationWithProfile[]
	isLoading: boolean
	sortField: SortField
	sortDirection: SortDirection
	onSort: (field: SortField) => void
	selectedIds: Set<string>
	onSelectAll: (checked: boolean) => void
	onSelect: (id: string, checked: boolean) => void
	onDeleteSingle: (notification: NotificationWithProfile) => void
	onView: (id: string) => void
	onBulkDeleteClick: () => void
	hasActiveFilters: boolean
	clearFilters: () => void
}

export function InboxList({
	filteredNotifications,
	isLoading,
	sortField,
	sortDirection,
	onSort,
	selectedIds,
	onSelectAll,
	onSelect,
	onDeleteSingle,
	onView,
	onBulkDeleteClick,
	hasActiveFilters,
	clearFilters
}: InboxListProps) {
	const allSelected =
		filteredNotifications.length > 0 && filteredNotifications.every((n) => selectedIds.has(n.id as string))
	const someSelected = filteredNotifications.some((n) => selectedIds.has(n.id as string))

	// ─── Virtuoso height state ─────────────────────────
	const [dynamicHeight, setDynamicHeight] = useState<number>(MAX_HEIGHT)

	const handleTotalListHeightChanged = useCallback((height: number) => {
		setDynamicHeight(Math.min(height + 8, MAX_HEIGHT))
	}, [])

	// Compute virtuoso container height
	const containerHeight = useMemo(() => {
		if (filteredNotifications.length === 0) return 0
		const calculated = filteredNotifications.length * ROW_HEIGHT
		return Math.min(calculated, MAX_HEIGHT)
	}, [filteredNotifications.length])

	return (
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
						onClick={onBulkDeleteClick}
					>
						<Trash2 className='mr-1.5 size-3.5' />
						Delete selected
					</Button>
					<Button variant='ghost' size='sm' className='text-muted-foreground' onClick={() => onSelectAll(false)}>
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
					onCheckedChange={(checked) => onSelectAll(!!checked)}
					aria-label='Select all notifications'
				/>
				<div className='flex flex-1 items-center gap-6'>
					<SortableHeader
						label='Date'
						field='created_at'
						currentSort={sortField}
						currentDirection={sortDirection}
						onSort={onSort}
					/>
					<SortableHeader
						label='Sender'
						field='sender'
						currentSort={sortField}
						currentDirection={sortDirection}
						onSort={onSort}
					/>
					<SortableHeader
						label='Type'
						field='type'
						currentSort={sortField}
						currentDirection={sortDirection}
						onSort={onSort}
					/>
					<SortableHeader
						label='Title'
						field='title'
						currentSort={sortField}
						currentDirection={sortDirection}
						onSort={onSort}
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
								<NotificationRow
									notification={notification}
									isSelected={selectedIds.has(notification.id as string)}
									onSelect={onSelect}
									onDelete={onDeleteSingle}
									onView={onView}
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
	)
}
