'use client'

import React, { useState, useCallback, useRef } from 'react'
import { TableVirtuoso, type TableComponents } from 'react-virtuoso'
import { useAllProfiles, type AllProfile } from '@/lib/react-query/queries'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { LoaderCircle, Search, Users } from 'lucide-react'
import getAccessLevelName from '@/context/access-levels'

// Defined outside the component so the references are stable across renders
const tableComponents: TableComponents<AllProfile> = {
	Table: ({ style, ...props }) => <Table style={style} {...props} />,
	TableHead: React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>((props, ref) => (
		<TableHeader ref={ref} {...props} />
	)),
	TableRow: ({ item: _item, ...props }: { item: AllProfile } & React.HTMLAttributes<HTMLTableRowElement>) => (
		<TableRow {...props} />
	),
	TableBody: React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>((props, ref) => (
		<TableBody ref={ref} {...props} />
	))
}

const HEADER_HEIGHT = 40
const FALLBACK_ROW_HEIGHT = 39
const MAX_HEIGHT = 7 * FALLBACK_ROW_HEIGHT + HEADER_HEIGHT // 313px — scrolls after 7 rows

export function AllMembersTable() {
	const { data: profiles, isLoading, isError } = useAllProfiles()
	const [search, setSearch] = useState('')
	const rowHeightRef = useRef(FALLBACK_ROW_HEIGHT)
	const [rowHeight, setRowHeight] = useState(FALLBACK_ROW_HEIGHT)

	// Measure the first rendered row's actual height
	const measuredCellRef = useCallback((node: HTMLTableCellElement | null) => {
		if (node) {
			const trHeight = node.closest('tr')?.offsetHeight ?? FALLBACK_ROW_HEIGHT
			if (trHeight !== rowHeightRef.current) {
				rowHeightRef.current = trHeight
				setRowHeight(trHeight)
			}
		}
	}, [])

	const filtered = profiles?.filter((p) => {
		const term = search.toLowerCase()
		return (
			p.full_name?.toLowerCase().includes(term) ||
			p.email?.toLowerCase().includes(term) ||
			p.user_org_role?.some((r) => r.orgs?.name?.toLowerCase().includes(term))
		)
	})

	const count = filtered?.length ?? 0
	const containerHeight =
		isLoading || isError || count === 0 ? 120 : Math.min(count * rowHeight + HEADER_HEIGHT, MAX_HEIGHT)

	return (
		<div className='space-y-3'>
			<div className='flex items-center gap-3'>
				<div className='relative flex-1 max-w-sm'>
					<Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
					<Input
						placeholder='Search by name, email, or org...'
						className='pl-8'
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
				{profiles && (
					<div className='flex items-center gap-1.5 text-sm text-muted-foreground'>
						<Users className='h-4 w-4' />
						<span>{profiles.length} users</span>
					</div>
				)}
			</div>

			<div className='rounded-md border overflow-hidden'>
				{isLoading && (
					<div className='flex justify-center items-center gap-2 py-10 text-sm text-muted-foreground'>
						<LoaderCircle className='h-4 w-4 animate-spin' />
						Loading members...
					</div>
				)}

				{isError && <div className='py-10 text-center text-sm text-destructive'>Failed to load members.</div>}

				{!isLoading && !isError && count === 0 && (
					<div className='py-10 text-center text-sm text-muted-foreground'>No members found.</div>
				)}

				{!isLoading && !isError && count > 0 && (
					<TableVirtuoso<AllProfile>
						style={{ height: containerHeight }}
						data={filtered}
						components={tableComponents}
						fixedHeaderContent={() => (
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead className='text-center'>Role</TableHead>
								<TableHead className='text-center'>Organizations</TableHead>
								<TableHead>Created at</TableHead>
							</TableRow>
						)}
						itemContent={(index, profile) => (
							<>
								<TableCell ref={index === 0 ? measuredCellRef : undefined} className='font-medium'>
									{profile.full_name || '—'}
								</TableCell>
								<TableCell className='text-muted-foreground'>{profile.email}</TableCell>
								<TableCell className='text-center'>
									{profile.is_superadmin ? (
										<Badge variant='default'>Superadmin</Badge>
									) : (
										<Badge variant='secondary'>User</Badge>
									)}
								</TableCell>
								<TableCell className='text-center'>
									{profile.user_org_role?.length > 0 ? (
										<div className='flex flex-wrap gap-1 justify-center'>
											<TooltipProvider>
												{profile.user_org_role.map((role) => (
													<Tooltip key={role.org_id}>
														<TooltipTrigger asChild>
															<Badge variant='outline' className='cursor-default'>
																{role.orgs?.name ?? 'Unknown'}
															</Badge>
														</TooltipTrigger>
														<TooltipContent>
															<p>{getAccessLevelName(role.access_lvl)}</p>
														</TooltipContent>
													</Tooltip>
												))}
											</TooltipProvider>
										</div>
									) : (
										<span className='text-muted-foreground text-sm'>No orgs</span>
									)}
								</TableCell>
								<TableCell className='text-muted-foreground text-sm'>
									{profile.updated_at
										? new Date(profile.updated_at).toLocaleDateString(undefined, {
												year: 'numeric',
												month: 'short',
												day: 'numeric'
											})
										: '—'}
								</TableCell>
							</>
						)}
					/>
				)}
			</div>
		</div>
	)
}
