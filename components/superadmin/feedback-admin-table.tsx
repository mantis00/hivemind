'use client'

import React, { useState, useMemo } from 'react'
import { TableVirtuoso, type TableComponents } from 'react-virtuoso'
import { useAllFeedback, type Feedback } from '@/lib/react-query/queries'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group'
import { LoaderCircle, Search, MessageSquare, Bug, XIcon, ArrowUpIcon, ArrowDownIcon } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

const tableComponents: TableComponents<Feedback> = {
	Table: ({ style, ...props }) => <table style={style} className='w-full caption-bottom text-sm' {...props} />,
	TableHead: React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
		function TableHeadWrapper(props, ref) {
			return <TableHeader ref={ref} className='sticky top-0 z-10 bg-card [&_tr]:border-b' {...props} />
		}
	),
	TableRow: React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
		function TableRowWrapper(props, ref) {
			return (
				<TableRow
					ref={ref}
					className='border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted'
					{...props}
				/>
			)
		}
	),
	TableBody: React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
		function TableBodyWrapper(props, ref) {
			return <TableBody ref={ref} className='[&_tr:last-child]:border-0' {...props} />
		}
	)
}

export function FeedbackAdminTable() {
	const { data: allFeedback, isLoading } = useAllFeedback()
	const [search, setSearch] = useState('')
	const [activeSearch, setActiveSearch] = useState('')
	const [sortKey, setSortKey] = useState<string>('created_at')
	const [sortUp, setSortUp] = useState(false)

	const displayedFeedback = useMemo(() => {
		let list = allFeedback ?? []
		if (activeSearch.trim()) {
			const val = activeSearch.trim().toLowerCase()
			list = list.filter(
				(f) =>
					f.title?.toLowerCase().includes(val) ||
					f.description?.toLowerCase().includes(val) ||
					f.profiles?.email?.toLowerCase().includes(val) ||
					f.profiles?.full_name?.toLowerCase().includes(val)
			)
		}
		if (sortKey) {
			list = [...list].sort((a, b) => {
				let na = ''
				let nb = ''
				if (sortKey === 'title') {
					na = a.title ?? ''
					nb = b.title ?? ''
				} else if (sortKey === 'type') {
					na = a.type ?? ''
					nb = b.type ?? ''
				} else if (sortKey === 'created_at') {
					const ta = new Date(a.created_at).getTime()
					const tb = new Date(b.created_at).getTime()
					return sortUp ? ta - tb : tb - ta
				}
				if (sortKey !== 'created_at') {
					return sortUp ? na.localeCompare(nb) : nb.localeCompare(na)
				}
				return 0
			})
		}
		return list
	}, [allFeedback, activeSearch, sortKey, sortUp])

	const isSorted = sortKey !== ''

	const handleSortChange = (value: string) => {
		if (value === 'reset') {
			setSortKey('created_at')
			setSortUp(false)
			return
		}
		setSortKey(value)
	}

	const handleToggleDirection = () => {
		setSortUp((prev) => !prev)
	}

	return (
		<div className='space-y-4'>
			<div className='flex flex-wrap items-center gap-3'>
				<Select onValueChange={handleSortChange} value={sortKey || ''} disabled={isLoading}>
					<SelectTrigger className='w-40'>
						<SelectValue placeholder='Sort' className='flex-1 min-w-0 truncate' />
						{isSorted && sortKey !== 'created_at' && (
							<span
								role='button'
								tabIndex={-1}
								onPointerDown={(e) => e.stopPropagation()}
								onClick={(e) => {
									e.stopPropagation()
									handleSortChange('reset')
								}}
								className='shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-foreground cursor-pointer'
							>
								<XIcon className='size-3.5 text-current' />
							</span>
						)}
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='created_at'>Date</SelectItem>
						<SelectItem value='title'>Title</SelectItem>
						<SelectItem value='type'>Type</SelectItem>
					</SelectContent>
				</Select>

				<Button variant='outline' size='icon' onClick={handleToggleDirection} disabled={isLoading || !isSorted}>
					{sortUp ? <ArrowUpIcon className='h-4 w-4' /> : <ArrowDownIcon className='h-4 w-4' />}
				</Button>

				<InputGroup className='flex-1 min-w-[200px]'>
					<InputGroupAddon>
						<Search className='h-4 w-4 text-muted-foreground' />
					</InputGroupAddon>
					<InputGroupInput
						placeholder='Search Feedback...'
						value={search}
						onChange={(e) => {
							setSearch(e.target.value)
							setActiveSearch(e.target.value)
						}}
					/>
					{search && (
						<InputGroupAddon align='inline-end' className='pr-1'>
							<Button
								variant='ghost'
								size='icon'
								className='h-6 w-6'
								onClick={() => {
									setSearch('')
									setActiveSearch('')
								}}
							>
								<XIcon className='h-4 w-4' />
							</Button>
						</InputGroupAddon>
					)}
				</InputGroup>
			</div>

			<div className='rounded-md border bg-card h-[500px] flex flex-col overflow-hidden'>
				{isLoading ? (
					<div className='flex items-center justify-center flex-1'>
						<LoaderCircle className='h-6 w-6 animate-spin text-muted-foreground' />
					</div>
				) : (
					<TableVirtuoso
						data={displayedFeedback}
						components={tableComponents}
						fixedHeaderContent={() => (
							<TableRow className='bg-muted/50 hover:bg-muted/50'>
								<TableHead className='w-[100px]'>Type</TableHead>
								<TableHead>Feedback</TableHead>
								<TableHead className='w-[120px] md:w-[200px]'>User</TableHead>
								<TableHead className='text-right w-[90px] md:w-[120px]'>Date</TableHead>
							</TableRow>
						)}
						itemContent={(index, item) => (
							<>
								<TableCell className={`align-top ${index % 2 === 1 ? 'bg-muted/40' : ''}`}>
									<Badge
										variant={item.type === 'bug' ? 'destructive' : 'default'}
										className='flex w-fit items-center justify-center gap-1 mt-1 p-1 md:px-2'
									>
										{item.type === 'bug' ? (
											<Bug className='h-3 w-3 shrink-0' />
										) : (
											<MessageSquare className='h-3 w-3 shrink-0' />
										)}
										<span className='capitalize hidden md:inline'>{item.type}</span>
									</Badge>
								</TableCell>
								<TableCell className={`align-top ${index % 2 === 1 ? 'bg-muted/40' : ''}`}>
									<div className='font-medium text-sm md:text-base'>{item.title}</div>
									<div className='text-xs md:text-sm text-muted-foreground mt-1 line-clamp-3 md:line-clamp-none break-words max-w-[200px] sm:max-w-[400px] md:max-w-[600px]'>
										{item.description}
									</div>
								</TableCell>
								<TableCell className={`align-top ${index % 2 === 1 ? 'bg-muted/40' : ''}`}>
									<div className='font-medium text-xs md:text-sm truncate'>
										{item.profiles?.full_name || 'Anonymous'}
									</div>
									<div className='text-[10px] md:text-xs text-muted-foreground truncate'>{item.profiles?.email}</div>
									{item.orgs && (
										<div className='text-[10px] md:text-xs text-muted-foreground mt-1 truncate'>{item.orgs.name}</div>
									)}
								</TableCell>
								<TableCell
									className={`align-top text-right text-muted-foreground text-xs md:text-sm ${index % 2 === 1 ? 'bg-muted/40' : ''}`}
								>
									{new Date(item.created_at).toLocaleDateString(undefined, {
										year: '2-digit',
										month: 'numeric',
										day: 'numeric'
									})}
								</TableCell>
							</>
						)}
					/>
				)}
			</div>
		</div>
	)
}
