// components/pwa/install-app-action.tsx
'use client'

import { useState } from 'react'
import { useInstallPrompt } from '@/hooks/use-install-prompt'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Button } from '@/components/ui/button'

interface InstallAppActionProps {
	children: (install: () => void, isInstalled: boolean) => React.ReactNode
}

export function InstallAppAction({ children }: InstallAppActionProps) {
	const { isInstallable, handleInstall, isInstalled, isIOS } = useInstallPrompt()

	const [open, setOpen] = useState(false)

	const install = () => {
		if (isInstallable) {
			handleInstall()
		} else {
			setOpen(true)
		}
	}

	if (isInstalled) return null

	return (
		<>
			{children(install, isInstalled)}

			<ResponsiveDialogDrawer
				trigger={null}
				title='Install App'
				description={
					isIOS
						? 'To add this app to your home screen: Tap the Share button by the search bar, then scroll down and tap "Add to Home Screen".'
						: 'To install this app, use your browser menu to add it to your home screen.'
				}
				open={open}
				onOpenChange={setOpen}
			>
				<Button variant='outline' onClick={() => setOpen(false)}>
					Close
				</Button>
			</ResponsiveDialogDrawer>
		</>
	)
}
