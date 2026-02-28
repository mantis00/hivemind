'use client'

import { useEffect, useState } from 'react'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Button } from '@/components/ui/button'
import { useInstallPrompt } from '@/hooks/use-install-prompt'
import { Download } from 'lucide-react'

export default function LoginInstallPrompt() {
	const { isInstallable, handleInstall, isIOS, isInstalled } = useInstallPrompt()
	const [showPrompt, setShowPrompt] = useState(false)

	useEffect(() => {
		// Add a small delay to allow beforeinstallprompt to fire
		const timer = setTimeout(() => {
			if ((isInstallable || isIOS) && !isInstalled && !sessionStorage.getItem('installPromptDismissed')) {
				setShowPrompt(true)
			}
		}, 1000)

		return () => clearTimeout(timer)
	}, [isInstallable, isIOS, isInstalled])

	const handleDismiss = () => {
		sessionStorage.setItem('installPromptDismissed', 'true')
		setShowPrompt(false)
	}

	const handleInstallClick = () => {
		if (isInstallable) {
			handleInstall()
		}
		handleDismiss()
	}

	return (
		<ResponsiveDialogDrawer
			title='Install Hivemind'
			description={
				isIOS
					? 'Add to your home screen for quick access. Tap Share, then "Add to Home Screen".'
					: 'Install our app for quick access and an app-like experience.'
			}
			trigger={null}
			open={showPrompt}
			onOpenChange={handleDismiss}
		>
			<Button variant='outline' onClick={handleDismiss}>
				Dismiss
			</Button>
			{!isIOS && (
				<Button onClick={handleInstallClick}>
					Install
					<Download className='size-5' />
				</Button>
			)}
		</ResponsiveDialogDrawer>
	)
}
