'use client'

import { useEnclosureById } from '@/lib/react-query/queries'
import { UUID } from 'crypto'

export function EnclosureHeading({ enclosureId, orgId }: { enclosureId: UUID; orgId: UUID }) {
	const { data: enclosure } = useEnclosureById(enclosureId, orgId)

	return <h1 className='text-2xl font-semibold'>Tasks for {enclosure?.name ?? enclosureId}</h1>
}
