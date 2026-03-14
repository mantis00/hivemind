'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useIsMounted } from '@/hooks/use-is-mounted'
import { getOrgIdFromPathname } from '@/context/verify-org-path'

export function ProtectedNavHomeLink() {
	const pathname = usePathname()
	const orgId = getOrgIdFromPathname(pathname)
	const href = orgId ? `/protected/orgs/${orgId}` : '/protected/orgs'
	const isMounted = useIsMounted()

	if (!isMounted) {
		return null
	}

	const hasOrgSidebar = !!orgId

	return (
		<Link
			href={href}
			className={`md:pl-7 md:ml-2 font-dancing-script text-2xl md:text-4xl font-bold ${hasOrgSidebar ? 'pl-10' : ''}`}
		>
			Hivemind
		</Link>
	)
}
