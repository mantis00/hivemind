'use client'

import { useEffect, useState } from 'react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogClose
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useInstallPrompt } from '@/hooks/use-install-prompt'
import { Download } from 'lucide-react'

export function LoginInstallPrompt() {
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
					<DialogTitle className='flex items-center gap-2'>
						<Download className='size-5' />
						Install Hivemind
					</DialogTitle>
					<DialogDescription>
						{isIOS
							? 'Add to your home screen for quick access. Tap Share, then "Add to Home Screen".'
							: 'Install our app for quick access and an app-like experience.'}
					</DialogDescription>
				</DialogHeader>
				<div className='flex justify-end gap-2'>
					<DialogClose asChild>
						<Button variant='outline'>Dismiss</Button>
					</DialogClose>
					{!isIOS && <Button onClick={handleInstallClick}>Install</Button>}
				</div>
			</DialogContent>
		</Dialog>
	)
}
