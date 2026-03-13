'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { getOrgIdFromPathname } from '@/context/push-subscription'

export function BackToOrgs() {
	const pathname = usePathname()
	const orgId = getOrgIdFromPathname(pathname)

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
