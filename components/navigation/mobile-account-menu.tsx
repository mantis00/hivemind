'use client'

import { useState, useEffect } from 'react'
import { User, LogOut, Download, Menu } from 'lucide-react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useLogout } from '@/hooks/use-logout'
import { useRouter } from 'next/navigation'
import { InstallAppAction } from '../pwa/install-app-action'

interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function MobileAccountMenu() {
	const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
	const [isInstalled, setIsInstalled] = useState(false)
	const router = useRouter()

	useEffect(() => {
		const handler = (e: Event) => {
			e.preventDefault()
			setInstallPrompt(e as BeforeInstallPromptEvent)
		}

		window.addEventListener('beforeinstallprompt', handler)

		if (window.matchMedia('(display-mode: standalone)').matches) {
			setIsInstalled(true)
		}

		return () => window.removeEventListener('beforeinstallprompt', handler)
	}, [])

	const logout = useLogout()

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant='ghost' size='icon' className='size-9' aria-label='Open account menu'>
					<Menu className='size-5' />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' className='w-48'>
				<DropdownMenuLabel className='text-foreground font-normal'>My Account</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={() => router.push('/protected/account')}>
					<User />
					<span>Account</span>
				</DropdownMenuItem>
				<InstallAppAction>
					{(install, isInstalled) =>
						!isInstalled && (
							<DropdownMenuItem
								onSelect={(e) => {
									e.preventDefault()
									install()
								}}
							>
								<Download className='size-4' />
								<span>Install App</span>
							</DropdownMenuItem>
						)
					}
				</InstallAppAction>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant='destructive' onClick={logout}>
					<LogOut />
					<span>Log Out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
