'use client'

import { usePathname } from 'next/navigation'
import { AppSidebar } from '@/components/navigation/app-sidebar'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useIsMounted } from '@/hooks/use-is-mounted'
import { getOrgIdFromPathname } from '@/context/verify-org-path'

export function ProtectedSidebar() {
	const pathname = usePathname()
	const isMounted = useIsMounted()

	if (!isMounted) {
		return null
	}

	if (!getOrgIdFromPathname(pathname)) {
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
