'use client'

import { type EnclosureTimelineRow, TimelineRecordType } from '@/lib/react-query/queries'
import { type ColumnDef, flexRender } from '@tanstack/react-table'
import { ArrowUpDown, Flag } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { RECORD_TYPE_LABELS, RECORD_TYPE_STYLES } from './history-constants'

export function getTimelineColumns(isMobile: boolean): ColumnDef<EnclosureTimelineRow>[] {
	const baseColumns: ColumnDef<EnclosureTimelineRow>[] = [
		{
			accessorKey: 'event_date',
			header: ({ column }) => (
				<Button
					variant='ghost'
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
					className='-ml-4 h-8 data-[state=open]:bg-accent'
				>
					Date
					<ArrowUpDown className='ml-2 h-4 w-4' />
				</Button>
			),
			cell: ({ row }) => {
				const date = row.getValue('event_date') as string
				if (!date) return <span className='text-sm'>—</span>
				const dateObj = new Date(date)
				return (
					<div className='flex flex-col'>
						<span className='text-sm whitespace-nowrap'>{format(dateObj, 'MMM d, yyyy')}</span>
						<span className='text-xs text-muted-foreground whitespace-nowrap'>{format(dateObj, 'h:mm a')}</span>
					</div>
				)
			}
		},
		{
			accessorKey: 'record_type',
			header: 'Type',
			cell: ({ row }) => {
				const type = row.getValue('record_type') as TimelineRecordType
				const details = row.original.details
				const isFlagged = type === 'note' && details === 'FLAGGED'

				if (isFlagged) {
					return (
						<Badge className='bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 font-medium gap-1'>
							<Flag className='h-3 w-3' />
							Note
						</Badge>
					)
				}

				return <Badge className={cn('font-medium', RECORD_TYPE_STYLES[type])}>{RECORD_TYPE_LABELS[type]}</Badge>
			}
		},
		{
			accessorKey: 'enclosure_name',
			header: 'Enclosure',
			cell: ({ row }) => (
				<span className='text-sm truncate max-w-[180px] block'>{row.getValue('enclosure_name') ?? '—'}</span>
			)
		}
	]

	if (!isMobile) {
		baseColumns.push({
			accessorKey: 'species_name',
			header: 'Species',
			cell: ({ row }) => (
				<span className='text-sm truncate max-w-[150px] block italic'>{row.getValue('species_name') ?? '—'}</span>
			)
		})
	}

	baseColumns.push({
		accessorKey: 'summary',
		header: 'Summary',
		cell: ({ row }) => {
			const summary = row.getValue('summary') as string | null
			return <span className='text-sm line-clamp-2'>{summary ?? '—'}</span>
		}
	})

	if (!isMobile) {
		baseColumns.push({
			accessorKey: 'details',
			header: 'Details',
			cell: ({ row }) => {
				const details = row.original.details
				const type = row.original.record_type

				if (!details || details === 'FLAGGED' || type !== 'task') {
					return <span className='text-muted-foreground'>—</span>
				}

				if (details.length > 50) {
					return (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<span className='text-sm text-muted-foreground truncate max-w-[200px] block cursor-help'>
										{details.slice(0, 50)}...
									</span>
								</TooltipTrigger>
								<TooltipContent className='max-w-xs'>
									<p className='text-sm whitespace-pre-wrap'>{details.replace(/\|/g, '\n')}</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)
				}

				return <span className='text-sm text-muted-foreground'>{details}</span>
			}
		})
	}

	baseColumns.push({
		accessorKey: 'user_name',
		header: 'User',
		cell: ({ row }) => <span className='text-sm truncate max-w-[120px] block'>{row.getValue('user_name') ?? '—'}</span>
	})

	return baseColumns
}

// Re-export flexRender so history-table.tsx can use it without importing @tanstack/react-table directly
export { flexRender }
