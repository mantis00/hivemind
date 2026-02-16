'use client'

import { useEffect, useState } from 'react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogClose,
	DialogBody,
	DialogFooter
} from '@/components/ui/dialog-to-drawer'
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
		<Dialog open={showPrompt} onOpenChange={handleDismiss}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Install Hivemind</DialogTitle>
					<DialogDescription>
						{isIOS
							? 'Add to your home screen for quick access. Tap Share, then "Add to Home Screen".'
							: 'Install our app for quick access and an app-like experience.'}
					</DialogDescription>
				</DialogHeader>
				<DialogBody>
					<div className='py-2' />
				</DialogBody>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant='outline'>Dismiss</Button>
					</DialogClose>
					{!isIOS && (
						<Button onClick={handleInstallClick}>
							Install
							<Download className='size-5' />
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
