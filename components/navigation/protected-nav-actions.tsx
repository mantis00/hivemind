'use client'

import { usePathname } from 'next/navigation'
import { NotificationDropdown } from '@/components/notification/notification-dropdown'
import { LogoutButton } from '@/components/account/logout-button'
import { useIsMounted } from '@/hooks/use-is-mounted'
import InstallAppButton from '@/components/pwa/install-app-button'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { MobileActionsMenu } from '@/components/navigation/mobile-actions-menu'

function isOrgRoute(pathname: string | null) {
	if (!pathname) return false
	return /^\/protected\/orgs\/\d+/.test(pathname)
}

export function ProtectedNavActions() {
	const pathname = usePathname()
	const isMounted = useIsMounted()
	const router = useRouter()

	if (!isMounted) {
		return null
	}

	if (isOrgRoute(pathname)) {
		return (
			<div className='flex items-center flex-row justify-end gap-2 mr-6 max-w-full'>
				<NotificationDropdown />
			</div>
		)
	}

	return (
		<div className='flex items-center justify-end gap-2 max-w-full'>
			<NotificationDropdown />

			{/* Desktop Actions */}
			<div className='hidden sm:flex items-center gap-2'>
				<Button variant='default' size='sm' className='w-auto px-4' onClick={() => router.push('/protected/account')}>
					Account
				</Button>
				<LogoutButton />
				<InstallAppButton />
			</div>

			{/* Mobile Menu */}
			<div className='sm:hidden'>
				<MobileActionsMenu />
			</div>
		</div>
	)
}
