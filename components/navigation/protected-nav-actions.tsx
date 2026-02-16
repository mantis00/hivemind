'use client'

import { usePathname } from 'next/navigation'
import { AccountButton } from '@/components/account/accout-button'
import { LogoutButton } from '@/components/account/logout-button'
import { useEffect, useState } from 'react'
import { InstallAppButton } from '@/components/pwa/install-app-button'

function isOrgRoute(pathname: string | null) {
	if (!pathname) return false
	return /^\/protected\/orgs\/\d+/.test(pathname)
}

export function ProtectedNavActions() {
	const pathname = usePathname()
	const [isMounted, setIsMounted] = useState(false)

	useEffect(() => {
		setIsMounted(true)
	}, [])

	if (!isMounted) {
		return null
	}

	if (isOrgRoute(pathname)) {
		return null
	}

	return (
		<div className='flex items-center flex-row justify-end gap-2 max-w-full'>
			<AccountButton />
			<LogoutButton />
			<InstallAppButton />
		</div>
	)
}
