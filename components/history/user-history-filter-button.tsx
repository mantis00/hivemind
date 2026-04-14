'use client'

import * as React from 'react'
import { CalendarIcon, ChevronDown, X } from 'lucide-react'
import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { VirtualizedCommand, type VirtualizedOption } from '@/components/ui/virtualized-combobox'
import { type ActivityLogEntry } from '@/lib/react-query/queries'

// ============================================================================
// Shared filter types — imported by user-history-table.tsx
// ============================================================================

export type UserActionFilters = {
	searchQuery: string
	actions: string[]
	entityTypes: string[]
	users: string[]
	dateFrom: string | null
	dateTo: string | null
}

export const DEFAULT_USER_ACTION_FILTERS: UserActionFilters = {
	searchQuery: '',
	actions: [],
	entityTypes: [],
	users: [],
	dateFrom: null,
	dateTo: null
}

// ============================================================================
// Local constants
// ============================================================================

const ACTION_OPTIONS = ['create', 'update', 'delete', 'deactivate']
const ENTITY_TYPE_OPTIONS = ['task', 'enclosure', 'org_species', 'enclosure_schedule', 'membership']

function toLabel(s: string) {
	return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

type OpenFilter = 'users' | null

// ============================================================================
// Component
// ============================================================================

interface UserHistoryFilterButtonProps {
	filters: UserActionFilters
	onFiltersChange: (filters: UserActionFilters) => void
	hasActiveFilters: boolean
	onReset: () => void
	data: ActivityLogEntry[]
	trigger: React.ReactNode
}

export function UserHistoryFilterButton({
	filters,
	onFiltersChange,
	hasActiveFilters,
	onReset,
	data,
	trigger
}: UserHistoryFilterButtonProps) {
	const [openFilter, setOpenFilter] = React.useState<OpenFilter>(null)
	const [datePickerOpen, setDatePickerOpen] = React.useState(false)

	const toggleFilter = (filter: Exclude<OpenFilter, null>) => {
		setOpenFilter((prev) => (prev === filter ? null : filter))
	}

	const dateRange: DateRange | undefined = React.useMemo(() => {
		if (filters.dateFrom && filters.dateTo) {
			return { from: new Date(filters.dateFrom + 'T00:00:00'), to: new Date(filters.dateTo + 'T00:00:00') }
		}
		return undefined
	}, [filters.dateFrom, filters.dateTo])

	const userOptions = React.useMemo<VirtualizedOption[]>(() => {
		const unique = [...new Set(data.map((r) => r.actor_name).filter(Boolean))] as string[]
		return unique.sort().map((u) => ({ value: u, label: u }))
	}, [data])

	const handleActionToggle = (action: string, checked: boolean) => {
		const next = checked ? [...filters.actions, action] : filters.actions.filter((a) => a !== action)
		onFiltersChange({ ...filters, actions: next })
	}

	const handleEntityTypeToggle = (entityType: string, checked: boolean) => {
		const next = checked ? [...filters.entityTypes, entityType] : filters.entityTypes.filter((t) => t !== entityType)
		onFiltersChange({ ...filters, entityTypes: next })
	}

	const handleDateRangeChange = (range: DateRange | undefined) => {
		onFiltersChange({
			...filters,
			dateFrom: range?.from ? format(range.from, 'yyyy-MM-dd') : null,
			dateTo: range?.to ? format(range.to, 'yyyy-MM-dd') : null
		})
	}

	const activeCount = [
		filters.actions.length > 0,
		filters.entityTypes.length > 0,
		filters.users.length > 0,
		filters.dateFrom !== null
	].filter(Boolean).length

	return (
		<ResponsiveDialogDrawer
			title='Filter Activity'
			description='Narrow activity logs by action, entity type, user, or date.'
			trigger={trigger}
		>
			{/* Action */}
			<div className='space-y-3'>
				<p className='text-sm font-medium text-muted-foreground'>
					Action {filters.actions.length > 0 && `(${filters.actions.length})`}
				</p>
				<div className='flex gap-2 flex-wrap'>
					{ACTION_OPTIONS.map((opt) => (
						<button
							key={opt}
							type='button'
							onClick={() => handleActionToggle(opt, !filters.actions.includes(opt))}
							className={`flex-1 rounded-full border py-2 text-sm transition-colors ${
								filters.actions.includes(opt)
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-border bg-background text-foreground'
							}`}
						>
							{toLabel(opt)}
						</button>
					))}
				</div>
			</div>

			<Separator className='my-1' />

			{/* Entity Type */}
			<div className='space-y-3'>
				<p className='text-sm font-medium text-muted-foreground'>
					Entity Type {filters.entityTypes.length > 0 && `(${filters.entityTypes.length})`}
				</p>
				<div className='flex gap-2 flex-wrap'>
					{ENTITY_TYPE_OPTIONS.map((opt) => (
						<button
							key={opt}
							type='button'
							onClick={() => handleEntityTypeToggle(opt, !filters.entityTypes.includes(opt))}
							className={`flex-1 rounded-full border py-2 text-sm transition-colors ${
								filters.entityTypes.includes(opt)
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-border bg-background text-foreground'
							}`}
						>
							{toLabel(opt)}
						</button>
					))}
				</div>
			</div>

			<Separator className='my-1' />

			{/* Users */}
			<div className='space-y-3'>
				<p className='text-sm font-medium text-muted-foreground'>
					Users {filters.users.length > 0 && `(${filters.users.length})`}
				</p>
				<Button
					type='button'
					variant='outline'
					className='w-full gap-2 justify-between'
					onClick={() => toggleFilter('users')}
				>
					{filters.users.length > 0 ? `${filters.users.length} selected` : 'Select users'}
					<ChevronDown className={`h-4 w-4 transition-transform ${openFilter === 'users' ? 'rotate-180' : ''}`} />
				</Button>
				{openFilter === 'users' && (
					<div className='rounded-md border p-0 **:data-[slot=command-input]:text-base **:data-[slot=command-input]:md:text-sm'>
						<div className='**:data-[slot=command-group]:p-0 **:data-[slot=command-item]:pl-3 **:data-[slot=command-item]:pr-2 **:data-[slot=command-item]:cursor-pointer'>
							<VirtualizedCommand
								height='240px'
								options={userOptions}
								placeholder='Search users...'
								selectedOptions={filters.users}
								emptyMessage='No users found.'
								onSelectOption={(value) => {
									const checked = !filters.users.includes(value)
									const next = checked ? [...filters.users, value] : filters.users.filter((u) => u !== value)
									onFiltersChange({ ...filters, users: next })
								}}
							/>
						</div>
					</div>
				)}
			</div>

			<Separator className='my-1' />

			{/* Date Range */}
			<div className='space-y-3'>
				<p className='text-sm font-medium text-muted-foreground'>Date Range</p>
				<Popover
					open={datePickerOpen}
					onOpenChange={(open) => {
						if (!open && dateRange?.from && !dateRange?.to) {
							handleDateRangeChange({ from: dateRange.from, to: dateRange.from })
						}
						setDatePickerOpen(open)
					}}
				>
					<PopoverTrigger asChild>
						<Button variant={dateRange?.from ? 'secondary' : 'outline'} className='w-full gap-2'>
							<CalendarIcon className='h-4 w-4' />
							{dateRange?.from ? (
								dateRange.to ? (
									<>
										{format(dateRange.from, 'LLL dd')} – {format(dateRange.to, 'LLL dd')}
									</>
								) : (
									format(dateRange.from, 'LLL dd, y')
								)
							) : (
								'Select date range'
							)}
						</Button>
					</PopoverTrigger>
					<PopoverContent className='w-auto p-0' align='start'>
						<Calendar
							mode='range'
							selected={dateRange}
							onSelect={(range) => {
								handleDateRangeChange(range)
								if (range?.from && range?.to) setDatePickerOpen(false)
							}}
							numberOfMonths={1}
						/>
					</PopoverContent>
				</Popover>
				{dateRange?.from && (
					<Button
						variant='ghost'
						size='sm'
						className='h-7 gap-1 text-xs text-muted-foreground'
						onClick={() => handleDateRangeChange(undefined)}
					>
						<X className='h-3 w-3' />
						Clear date range
					</Button>
				)}
			</div>

			{hasActiveFilters && (
				<>
					<Separator className='my-1' />
					<Button variant='default' className='w-full gap-1.5' onClick={onReset}>
						<X className='h-4 w-4' />
						Clear all filters ({activeCount})
					</Button>
				</>
			)}
		</ResponsiveDialogDrawer>
	)
}
