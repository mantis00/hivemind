'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

export type TaskFilterOption = {
	id: string
	label: string
	count: number
}

type TaskFilterListProps = {
	title: string
	description: string
	options: TaskFilterOption[]
	selectedIds: string[]
	onToggle: (id: string) => void
	onClear: () => void
}

export function TaskFilterList({ title, description, options, selectedIds, onToggle, onClear }: TaskFilterListProps) {
	const [query, setQuery] = useState('')
	const [isOpen, setIsOpen] = useState(false)
	const deferredQuery = useDeferredValue(query)
	const normalizedQuery = deferredQuery.trim().toLowerCase()

	const filteredOptions = useMemo(() => {
		if (normalizedQuery.length === 0) {
			return options
		}

		return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
	}, [options, normalizedQuery])

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<Card className='h-full'>
				<CardHeader className='space-y-1 pb-2'>
					<div className='flex items-start justify-between gap-2'>
						<div className='space-y-1'>
							<CardTitle className='text-base'>{title}</CardTitle>
							<CardDescription>{description}</CardDescription>
						</div>
						<div className='flex shrink-0 items-center gap-1'>
							{selectedIds.length > 0 ? (
								<Button variant='ghost' size='sm' className='h-7 px-2 text-xs' onClick={onClear}>
									Clear
								</Button>
							) : null}
							<CollapsibleTrigger asChild>
								<Button variant='ghost' size='icon' className='h-8 w-8' aria-label={`Toggle ${title} filter`}>
									<ChevronDownIcon
										className={cn(
											'h-4 w-4 text-muted-foreground transition-transform duration-200',
											isOpen && 'rotate-180'
										)}
									/>
								</Button>
							</CollapsibleTrigger>
						</div>
					</div>
					{selectedIds.length > 0 ? (
						<p className='text-xs text-muted-foreground'>
							{selectedIds.length} selected {selectedIds.length === 1 ? 'option' : 'options'}
						</p>
					) : null}
				</CardHeader>
				<CollapsibleContent>
					<CardContent className='space-y-2'>
						<Input
							placeholder={`Search ${title.toLowerCase()}...`}
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							className='h-8'
						/>
						<div className='max-h-52 space-y-2 overflow-y-auto rounded-md border p-2'>
							{filteredOptions.length === 0 ? (
								<p className='text-xs text-muted-foreground'>No matching options.</p>
							) : (
								filteredOptions.map((option) => (
									<label
										key={option.id}
										className='flex cursor-pointer items-center justify-between gap-2 rounded px-1 py-1 hover:bg-muted/50'
									>
										<div className='flex items-center gap-2'>
											<Checkbox
												checked={selectedIds.includes(option.id)}
												onCheckedChange={() => onToggle(option.id)}
												aria-label={`${title} ${option.label}`}
											/>
											<span className='text-sm'>{option.label}</span>
										</div>
										<span className='text-xs text-muted-foreground'>{option.count}</span>
									</label>
								))
							)}
						</div>
					</CardContent>
				</CollapsibleContent>
			</Card>
		</Collapsible>
	)
}
