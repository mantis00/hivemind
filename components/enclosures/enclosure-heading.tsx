'use client'

import { useEnclosureById } from '@/lib/react-query/queries'
import { UUID } from 'crypto'
import { Badge } from '../ui/badge'

export function EnclosureHeading({ enclosureId, orgId }: { enclosureId: UUID; orgId: UUID }) {
	const { data: enclosure } = useEnclosureById(enclosureId, orgId)

	return enclosure?.name ? (
		<div className='flex flex-col gap-6'>
			<h1 className='text-2xl font-semibold'>Tasks for {enclosure.name}</h1>
			<p className='text-sm text-muted-foreground'>View and manage your enclosure&apos;s tasks</p>
			{enclosure.is_active === false ? (
				<Badge variant='outline' className='ml-2 font-semibold border-destructive/40 text-destructive'>
					Inactive
				</Badge>
			) : null}
		</div>
	) : (
		<></>
	)
}
