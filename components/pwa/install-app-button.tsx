'use client'

import { useInstallPrompt } from '@/hooks/use-install-prompt'
import { useState } from 'react'
import { Download } from 'lucide-react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogClose
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function InstallAppButton() {
	const { isInstallable, handleInstall, isInstalled, isIOS } = useInstallPrompt()
	const [showInstructions, setShowInstructions] = useState(false)

	const handleClick = () => {
		if (isInstallable) {
			handleInstall()
		} else {
			setShowInstructions(true)
		}
	}

	if (isInstalled) return null

	return (
		<>
			<button onClick={handleClick} className='flex items-center gap-1.5 text-sm hover:underline cursor-pointer'>
				<Download className='size-4' />
				Install app
			</button>

			<Dialog open={showInstructions} onOpenChange={setShowInstructions}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Install App</DialogTitle>
						<DialogDescription>
							{isIOS
								? 'To add this app to your home screen: Tap the Share button by the search bar, then scroll down and tap "Add to Home Screen".'
								: 'To install this app, use your browser menu to add it to your home screen.'}
						</DialogDescription>
					</DialogHeader>
					<div className='flex justify-end gap-2'>
						<DialogClose asChild>
							<Button variant='outline'>Dismiss</Button>
						</DialogClose>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
