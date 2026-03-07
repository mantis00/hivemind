import { Search, CalendarIcon, X, Bell } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DateRange } from 'react-day-picker'
import type { NotificationType } from '@/context/notification-config'
import { typeIcons, typeColors, typeLabels } from '@/context/notification-config'

interface InboxFiltersProps {
	searchQuery: string
	setSearchQuery: (query: string) => void
	typeFilter: string
	setTypeFilter: (type: string) => void
	senderFilter: string
	setSenderFilter: (sender: string) => void
	viewedFilter: string
	setViewedFilter: (viewed: string) => void
	dateRange: DateRange | undefined
	setDateRange: (range: DateRange | undefined) => void
	uniqueTypes: string[]
	uniqueSenders: Array<{ id: string; name: string }>
	hasActiveFilters: boolean
	clearFilters: () => void
}

export function InboxFilters({
	searchQuery,
	setSearchQuery,
	typeFilter,
	setTypeFilter,
	senderFilter,
	setSenderFilter,
	viewedFilter,
	setViewedFilter,
	dateRange,
	setDateRange,
	uniqueTypes,
	uniqueSenders,
	hasActiveFilters,
	clearFilters
}: InboxFiltersProps) {
	return (
		<section className='space-y-3'>
			<h2 className='text-lg font-semibold'>Filters</h2>
			<div className='flex flex-wrap items-end gap-3'>
				{/* Search */}
				<div className='relative flex-1 min-w-50 max-w-sm'>
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
					<SelectTrigger className='w-35'>
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
												className={cn('size-3.5', typeColors[type as NotificationType] ?? 'text-muted-foreground')}
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
					<SelectTrigger className='w-40'>
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
					<SelectTrigger className='w-32.5'>
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
							className={cn('w-50 justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}
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
						<Calendar mode='range' selected={dateRange} onSelect={(range) => setDateRange(range)} numberOfMonths={2} />
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
	)
}
