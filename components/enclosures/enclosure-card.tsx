'use client'

import { Calendar, Hash, MapPin } from 'lucide-react'
import { type Enclosure } from '@/lib/react-query/queries'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '../ui/badge'
import { Checkbox } from '../ui/checkbox'
import { formatDate } from '@/context/format-date'

export function EnclosureCard({
	enclosure,
	onClick,
	selectable = false,
	selected = false,
	onSelectChange
}: {
	enclosure: Enclosure
	onClick: () => void
	selectable?: boolean
	selected?: boolean
	onSelectChange?: (checked: boolean) => void
}) {
	const isInactive = enclosure.is_active === false

	return (
		<>
			<Card
				className={`cursor-pointer transition-colors hover:bg-accent/50 border-l-4 py-2 ${
					selected
						? 'border-l-primary bg-accent/30'
						: isInactive
							? 'border-l-muted-foreground/30 opacity-60'
							: 'border-l-primary/20'
				}`}
				onClick={() => {
					if (selectable) {
						onSelectChange?.(!selected)
					} else {
						onClick()
					}
				}}
			>
				<CardContent className='p-2'>
					<div className='flex items-center justify-between gap-1'>
						{selectable && (
							<Checkbox
								checked={selected}
								onCheckedChange={(checked) => onSelectChange?.(!!checked)}
								onClick={(e) => e.stopPropagation()}
								className='shrink-0 m-2'
							/>
						)}
						<div className='space-y-1.5 flex-1 min-w-0'>
							<div className='flex items-center gap-1.5 min-w-0'>
								<p className={`font-medium text-sm truncate ${isInactive ? 'text-muted-foreground' : ''}`}>
									{enclosure.name}
								</p>
								{isInactive && (
									<Badge variant='outline' className='shrink-0 text-xs text-destructive border-destructive/40'>
										Inactive
									</Badge>
								)}
							</div>
							<div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
								<MapPin className='h-3 w-3 shrink-0' />
								<span className='truncate'>{enclosure.locations?.name}</span>
							</div>
							<div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
								<Calendar className='h-3 w-3 shrink-0' />
								{enclosure.created_at && <span>{enclosure.created_at ? formatDate(enclosure.created_at) : '—'}</span>}
							</div>
						</div>
						<Badge variant='secondary' className='gap-1 self-center shrink-0'>
							<Hash className='h-3 w-3' />
							{enclosure.current_count}
						</Badge>
					</div>
				</CardContent>
			</Card>
		</>
	)
}
