'use client'

import { usePathname } from 'next/navigation'
import { NotificationDropdown } from '@/components/notification/notification-dropdown'
import { LogoutButton } from '@/components/account/logout-button'
import { useIsMounted } from '@/hooks/use-is-mounted'
import InstallAppButton from '@/components/pwa/install-app-button'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { MobileActionsMenu } from '@/components/navigation/mobile-actions-menu'
import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { getOrgIdFromPathname } from '@/context/verify-org-path'

export function ProtectedNavActions() {
	const pathname = usePathname()
	const isMounted = useIsMounted()
	const router = useRouter()
	const [isNavigating, setIsNavigating] = useState(false)
	const [prevPathname, setPrevPathname] = useState(pathname)

	// Reset navigating state when pathname changes (render-time, avoids setState-in-effect)
	if (prevPathname !== pathname) {
		setPrevPathname(pathname)
		if (isNavigating) setIsNavigating(false)
	}

	if (!isMounted) {
		return null
	}

	if (getOrgIdFromPathname(pathname)) {
		return (
			<div className='flex items-center flex-row justify-end gap-2 mr-6 max-w-full'>
				<NotificationDropdown />
			</div>
		)
	}

	return (
		<div className='flex items-center justify-end gap-2 max-w-full'>
			<div className='pr-1'>
				{' '}
				{/* slight padding to prevent bell from being too close to buttons */}
				<NotificationDropdown />
			</div>
			{/* Desktop Actions */}
			<div className='hidden sm:flex items-center gap-2'>
				<Button
					variant='default'
					size='sm'
					className='w-auto px-4'
					disabled={isNavigating}
					onClick={() => {
						if (pathname === '/protected/account') return
						setIsNavigating(true)
						router.push('/protected/account')
					}}
				>
					{isNavigating ? <LoaderCircle className='animate-spin' /> : 'Account'}
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
