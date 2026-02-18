'use client'

import { usePathname } from 'next/navigation'
import { AppSidebar } from '@/components/navigation/app-sidebar'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useEffect, useState } from 'react'

function isOrgRoute(pathname: string | null) {
	if (!pathname) return false
	return /^\/protected\/orgs\/\d+/.test(pathname)
}

export function ProtectedSidebar() {
	const pathname = usePathname()
	const [isMounted, setIsMounted] = useState(false)

	useEffect(() => {
		setIsMounted(true)
	}, [])

	if (!isMounted) {
		return null
	}

	if (!isOrgRoute(pathname)) {
		return null
	}

	return (
		<>
			<AppSidebar />
			<div className='w-0 overflow-visible relative z-50'>
				<SidebarTrigger className='sticky top-4 ml-1 mt-4 pointer-events-auto size-9 [&>svg]:size-5' />
			</div>
		</>
	)
}
