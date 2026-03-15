'use client'

import { useEnclosureById } from '@/lib/react-query/queries'
import { UUID } from 'crypto'

export function EnclosureHeading({ enclosureId, orgId }: { enclosureId: UUID; orgId: UUID }) {
	const { data: enclosure } = useEnclosureById(enclosureId, orgId)

	return enclosure?.name ? (
		<div className='flex flex-col gap-6'>
			<h1 className='text-2xl font-semibold'>
				Tasks for {enclosure.name}
				{enclosure.is_active === false ? <small className='ml-2 font-semibold text-destructive'>Inactive</small> : null}
			</h1>
			<p className='text-sm text-muted-foreground pb-6'>View and manage your enclosure&apos;s tasks</p>
		</div>
	) : (
		<></>
	)
}
