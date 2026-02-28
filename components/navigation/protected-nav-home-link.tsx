'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export function ProtectedNavHomeLink() {
	const pathname = usePathname()
	// Match UUIDs (8-4-4-4-12 hex)
	const match = pathname?.match(
		/^\/protected\/orgs\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/
	)
	const orgId = match?.[1]
	const href = orgId ? `/protected/orgs/${orgId}` : '/protected/orgs'
	const [isMounted, setIsMounted] = useState(false)

	useEffect(() => {
		setIsMounted(true)
	}, [])

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
