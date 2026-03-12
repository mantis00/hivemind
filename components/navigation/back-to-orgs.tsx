'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

export function BackToOrgs() {
	const pathname = usePathname()
	const orgId = useMemo(() => {
		const match = pathname?.match(
			/^\/protected\/orgs\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/
		)
		return match?.[1] ?? null
	}, [pathname])

	if (orgId) return null

	return (
		<Link
			href='/protected/orgs'
			className='flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors'
		>
			<ArrowLeft className='size-4' />
			Back to Orgs
		</Link>
	)
}
