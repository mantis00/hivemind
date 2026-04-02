'use client'

import { usePathname } from 'next/navigation'
import { NotificationDropdown } from '@/components/notification/notification-dropdown'
import { LogoutButton } from '@/components/account/logout-button'
import { useIsMounted } from '@/hooks/use-is-mounted'
import InstallAppButton from '@/components/pwa/install-app-button'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { MobileActionsMenu } from '@/components/navigation/mobile-actions-menu'
import { LoaderCircle, ScanLine, X } from 'lucide-react'
import { useState } from 'react'
import { getOrgIdFromPathname } from '@/context/verify-org-path'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { QrScannerContent } from '@/components/qr/qr-scanner-content'

export function ProtectedNavActions() {
	const pathname = usePathname()
	const isMounted = useIsMounted()
	const router = useRouter()
	const [isScannerOpen, setIsScannerOpen] = useState(false)
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

	const scannerDialog = (
		<ResponsiveDialogDrawer
			title='Scan QR Code'
			description='Open your camera and point it at an enclosure QR code.'
			open={isScannerOpen}
			onOpenChange={setIsScannerOpen}
			trigger={
				<Button variant='ghost' size='icon' className='size-9' aria-label='Open QR scanner'>
					<ScanLine className='size-5' />
				</Button>
			}
			titleAction={
				<Button
					variant='ghost'
					size='icon'
					className='size-8'
					aria-label='Close QR scanner'
					onClick={() => setIsScannerOpen(false)}
				>
					<X className='size-4' />
				</Button>
			}
			className='sm:max-w-3xl'
		>
			<QrScannerContent onRequestClose={() => setIsScannerOpen(false)} />
		</ResponsiveDialogDrawer>
	)

	if (getOrgIdFromPathname(pathname)) {
		return (
			<div className='flex items-center flex-row justify-end gap-2 mr-6 max-w-full'>
				{scannerDialog}
				<NotificationDropdown />
			</div>
		)
	}

	return (
		<div className='flex items-center justify-end gap-2 max-w-full'>
			{scannerDialog}
			<NotificationDropdown />
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
