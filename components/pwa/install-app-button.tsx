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
	DialogClose,
	DialogTrigger,
	DialogBody,
	DialogFooter
} from '@/components/ui/dialog-to-drawer'
import { Button } from '@/components/ui/button'

export default function InstallAppButton() {
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
			<Dialog open={showInstructions} onOpenChange={setShowInstructions}>
				<DialogTrigger asChild>
					<Button variant='ghost' onClick={handleClick}>
						<Download className='size-4' />
						Install App
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Install App</DialogTitle>
						<DialogDescription>
							{isIOS
								? 'To add this app to your home screen: Tap the Share button by the search bar, then scroll down and tap "Add to Home Screen".'
								: 'To install this app, use your browser menu to add it to your home screen.'}
						</DialogDescription>
					</DialogHeader>
					<DialogBody>
						<div className='py-2' />
					</DialogBody>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant='outline'>Close</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
