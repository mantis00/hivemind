'use client'

import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/account/logout-button'
import { useEffect, useState } from 'react'
import InstallAppButton from '@/components/pwa/install-app-button'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

function isOrgRoute(pathname: string | null) {
	if (!pathname) return false
	return /^\/protected\/orgs\/\d+/.test(pathname)
}

export function ProtectedNavActions() {
	const pathname = usePathname()
	const [isMounted, setIsMounted] = useState(false)
	const router = useRouter()

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
			<Button variant='default' size='sm' className='w-auto px-4' onClick={() => router.push('/protected/account')}>
				Account
			</Button>
			<LogoutButton />
			<InstallAppButton />
		</div>
	)
}
