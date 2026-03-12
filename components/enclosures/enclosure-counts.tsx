'use client'

import { useParams } from 'next/navigation'
import { UUID } from 'crypto'
import { useOrgSpecies, useOrgEnclosureCount } from '@/lib/react-query/queries'
import { Badge } from '@/components/ui/badge'

export function EnclosureCounts() {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const { data: orgSpecies } = useOrgSpecies(orgId as UUID)
	const { data: enclosureCount } = useOrgEnclosureCount(orgId as UUID)

	return (
		<div className='flex items-center gap-2'>
			<Badge variant='secondary'>{orgSpecies?.length ?? 0} species</Badge>
			<Badge variant='secondary'>{enclosureCount ?? 0} enclosures</Badge>
		</div>
	)
}
