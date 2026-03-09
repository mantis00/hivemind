'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InstallAppAction } from './install-app-action'

export default function InstallAppButton() {
	return (
		<InstallAppAction>
			{(install) => (
				<Button variant='ghost' onClick={install}>
					<Download className='size-4' />
					Install App
				</Button>
			)}
		</InstallAppAction>
	)
}
