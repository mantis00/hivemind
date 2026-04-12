'use client'

import * as React from 'react'
import { type EnclosureTimelineRow, TimelineRecordType } from '@/lib/react-query/queries'
import { type ColumnDef, flexRender } from '@tanstack/react-table'
import { ArrowUpDown, Flag } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { RECORD_TYPE_LABELS, RECORD_TYPE_STYLES } from './history-constants'

// Only shows tooltip when the text is actually overflowing its container
function TruncatedCell({
	text,
	className,
	tooltipContent
}: {
	text: string
	className?: string
	tooltipContent?: React.ReactNode
}) {
	const ref = React.useRef<HTMLSpanElement>(null)
	const [open, setOpen] = React.useState(false)

	return (
		<TooltipProvider>
			<Tooltip
				open={open}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						setOpen(false)
						return
					}
					if (ref.current && ref.current.scrollWidth > ref.current.clientWidth) setOpen(true)
				}}
			>
				<TooltipTrigger asChild>
					<span ref={ref} className={className}>
						{text}
					</span>
				</TooltipTrigger>
				<TooltipContent className='max-w-xs'>{tooltipContent ?? <p className='text-sm'>{text}</p>}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}

// Shows tooltip when text is clamped (multi-line truncation)
function TruncatedMultilineCell({
	text,
	className,
	tooltipContent
}: {
	text: string
	className?: string
	tooltipContent?: React.ReactNode
}) {
	const ref = React.useRef<HTMLParagraphElement>(null)
	const [open, setOpen] = React.useState(false)

	return (
		<TooltipProvider>
			<Tooltip
				open={open}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						setOpen(false)
						return
					}
					if (ref.current && ref.current.scrollHeight > ref.current.clientHeight + 2) setOpen(true)
				}}
			>
				<TooltipTrigger asChild>
					<p ref={ref} className={className}>
						{text}
					</p>
				</TooltipTrigger>
				<TooltipContent className='max-w-xs'>{tooltipContent ?? <p className='text-sm'>{text}</p>}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}

export function getTimelineColumns(): ColumnDef<EnclosureTimelineRow>[] {
	const baseColumns: ColumnDef<EnclosureTimelineRow>[] = [
		{
			accessorKey: 'event_date',
			header: ({ column }) => (
				<Button
					variant='ghost'
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
					className='-ml-4 h-8 data-[state=open]:bg-accent font-bold'
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
			header: () => <span className='font-bold whitespace-nowrap'>Enclosure</span>,
			cell: ({ row }) => {
				const value = row.getValue('enclosure_name') as string | null
				if (!value) return <span className='text-sm'>—</span>
				return <TruncatedCell text={value} className='text-sm font-medium text-primary' />
			}
		}
	]

	baseColumns.push({
		accessorKey: 'species_name',
		header: 'Species',
		cell: ({ row }) => {
			const value = row.getValue('species_name') as string | null
			if (!value) return <span className='text-sm'>—</span>
			return <TruncatedCell text={value} className='text-sm italic cursor-default' />
		}
	})

	baseColumns.push({
		accessorKey: 'summary',
		header: 'Summary',
		cell: ({ row }) => {
			const summary = row.getValue('summary') as string | null
			if (!summary) return <span className='text-sm'>—</span>
			const type = row.original.record_type
			const colonIdx = type === 'count_change' ? summary.indexOf(': ') : -1
			if (colonIdx !== -1) {
				const label = summary.slice(0, colonIdx)
				const value = summary.slice(colonIdx + 2)
				return (
					<div className='flex flex-col'>
						<TruncatedCell text={label} className='text-sm cursor-default' />
						<TruncatedCell text={value} className='text-xs text-muted-foreground cursor-default' />
					</div>
				)
			}
			return <TruncatedCell text={summary} className='text-sm cursor-default' />
		}
	})

	baseColumns.push({
		accessorKey: 'details',
		header: 'Details',
		cell: ({ row }) => {
			const details = row.original.details
			const type = row.original.record_type

			if (!details || details === 'FLAGGED') {
				return <span className='text-muted-foreground'>—</span>
			}

			const tooltipText = type === 'task' ? details.replace(/\|/g, '\n') : details

			return (
				<TruncatedMultilineCell
					text={details}
					className='text-sm text-muted-foreground cursor-default line-clamp-2'
					tooltipContent={<p className='text-sm whitespace-pre-wrap'>{tooltipText}</p>}
				/>
			)
		}
	})

	baseColumns.push({
		accessorKey: 'priority',
		header: 'Priority',
		cell: ({ row }) => {
			const value = row.getValue('priority') as string | null
			if (!value) return <span className='text-muted-foreground'>—</span>
			const styles: Record<string, string> = {
				high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
				medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
				low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
			}
			return <Badge className={cn('font-medium capitalize', styles[value] ?? '')}>{value}</Badge>
		}
	})

	baseColumns.push({
		accessorKey: 'user_name',
		header: 'User',
		cell: ({ row }) => {
			const value = row.getValue('user_name') as string | null
			if (!value) return <span className='text-sm'>—</span>
			return <TruncatedCell text={value} className='text-sm cursor-default' />
		}
	})

	return baseColumns
}

// Re-export flexRender so history-table.tsx can use it without importing @tanstack/react-table directly
export { flexRender }
