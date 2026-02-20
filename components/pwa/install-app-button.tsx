'use client'

import { useInstallPrompt } from '@/hooks/use-install-prompt'
import { useState } from 'react'
import { Download } from 'lucide-react'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
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
		<ResponsiveDialogDrawer
			title='Install App'
			description={
				isIOS
					? 'To add this app to your home screen: Tap the Share button by the search bar, then scroll down and tap "Add to Home Screen".'
					: 'To install this app, use your browser menu to add it to your home screen.'
			}
			trigger={
				<Button variant='ghost' onClick={handleClick}>
					<Download className='size-4' />
					Install App
				</Button>
			}
			open={showInstructions}
			onOpenChange={(isOpen) => setShowInstructions(isOpen)}
		>
			<div className='py-2' />
			<Button variant='outline' onClick={() => setShowInstructions(false)}>
				Close
			</Button>
		</ResponsiveDialogDrawer>
	)
}
