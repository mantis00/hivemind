'use client'

import { useParams } from 'next/navigation'
import { UUID } from 'crypto'
import { useOrgSpecies, useOrgEnclosureCount } from '@/lib/react-query/queries'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export function EnclosureCounts() {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const { data: orgSpecies } = useOrgSpecies(orgId as UUID)
	const { data: enclosureCount } = useOrgEnclosureCount(orgId as UUID)

	const loaded = orgSpecies !== undefined && enclosureCount !== undefined

	return (
		<div className='flex items-center gap-2'>
			{loaded ? (
				<>
					<Badge variant='secondary'>{orgSpecies?.length} species</Badge>
					<Badge variant='secondary'>{enclosureCount} enclosures</Badge>
				</>
			) : (
				<>
					<Skeleton className='h-5 w-16 rounded-full' />
					<Skeleton className='h-5 w-20 rounded-full' />
				</>
			)}
		</div>
	)
}
