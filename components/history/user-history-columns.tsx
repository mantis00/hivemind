'use client'

import * as React from 'react'
import { type ActivityLogEntry } from '@/lib/react-query/queries'
import { type ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// ============================================================================
// Column styles
// ============================================================================

export const ACTION_STYLES: Record<string, string> = {
	create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
	update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
	delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
	deactivate: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
}

export const ENTITY_TYPE_STYLES: Record<string, string> = {
	task: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
	enclosure: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
	org_species: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
	enclosure_schedule: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
	membership: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
}

export function toLabel(s: string) {
	return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ============================================================================
// Truncated cell with overflow tooltip
// ============================================================================

export function TCell({ text, className }: { text: string; className?: string }) {
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
					<span ref={ref} className={cn('block truncate', className)}>
						{text}
					</span>
				</TooltipTrigger>
				<TooltipContent className='max-w-xs'>
					<p className='text-sm'>{text}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}

// ============================================================================
// Sort button
// ============================================================================

export function SortBtn({
	column,
	label
}: {
	column: import('@tanstack/react-table').Column<ActivityLogEntry>
	label: string
}) {
	return (
		<Button
			variant='ghost'
			onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
			className='-ml-3 h-8 gap-1'
		>
			{label}
			<ArrowUpDown className='h-3.5 w-3.5' />
		</Button>
	)
}

// ============================================================================
// Column definitions
// ============================================================================

export function getActivityLogColumns(): ColumnDef<ActivityLogEntry>[] {
	return [
		{
			accessorKey: 'created_at',
			id: 'created_at',
			header: ({ column }) => <SortBtn column={column} label='Date' />,
			cell: ({ row }) => {
				const v = row.getValue('created_at') as string
				if (!v) return <span className='text-sm'>—</span>
				const dateObj = new Date(v)
				return (
					<div className='flex flex-col'>
						<span className='text-sm whitespace-nowrap'>{format(dateObj, 'MMM d, yyyy')}</span>
						<span className='text-xs text-muted-foreground whitespace-nowrap'>{format(dateObj, 'h:mm a')}</span>
					</div>
				)
			}
		},
		{
			accessorKey: 'action',
			header: 'Action',
			cell: ({ row }) => {
				const v = row.getValue('action') as string
				const cls = ACTION_STYLES[v] ?? 'bg-muted text-muted-foreground'
				return (
					<span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', cls)}>
						{toLabel(v)}
					</span>
				)
			}
		},
		{
			accessorKey: 'entity_type',
			header: 'Entity',
			cell: ({ row }) => {
				const v = row.getValue('entity_type') as string
				const cls = ENTITY_TYPE_STYLES[v] ?? 'bg-muted text-muted-foreground'
				return (
					<span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', cls)}>
						{toLabel(v)}
					</span>
				)
			}
		},
		{
			accessorKey: 'entity_name',
			header: 'Name',
			cell: ({ row }) => {
				const v = row.getValue('entity_name') as string | null
				if (!v) return <span className='text-muted-foreground'>—</span>
				return <TCell text={v} className='text-sm' />
			}
		},
		{
			accessorKey: 'summary',
			header: 'Summary',
			cell: ({ row }) => {
				const v = row.getValue('summary') as string | null
				if (!v) return <span className='text-muted-foreground'>—</span>
				return <TCell text={v} className='text-sm' />
			}
		},
		{
			accessorKey: 'actor_name',
			header: 'User',
			cell: ({ row }) => {
				const v = row.getValue('actor_name') as string | null
				if (!v) return <span className='text-sm'>—</span>
				return <TCell text={v} className='text-sm' />
			}
		}
	]
}
