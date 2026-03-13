'use client'

import { User, LogOut, Download, Menu, LoaderCircle } from 'lucide-react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useLogout } from '@/lib/react-query/auth'
import { useRouter } from 'next/navigation'
import { InstallAppAction } from '../pwa/install-app-action'

export function MobileActionsMenu() {
	const router = useRouter()
	const logoutMutation = useLogout()

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant='ghost' size='icon' className='size-9' aria-label='Open account menu'>
					<Menu className='size-5' />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' className='w-48'>
				<DropdownMenuItem className='cursor-pointer' onClick={() => router.push('/protected/account')}>
					<User />
					<span>Account</span>
				</DropdownMenuItem>
				<InstallAppAction>
					{(install, isInstalled) =>
						!isInstalled && (
							<DropdownMenuItem
								className='cursor-pointer'
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
				<DropdownMenuItem
					className='cursor-pointer'
					variant='destructive'
					disabled={logoutMutation.isPending}
					onSelect={(e) => {
						e.preventDefault()
						logoutMutation.mutate()
					}}
				>
					{logoutMutation.isPending ? <LoaderCircle className='size-4 animate-spin' /> : <LogOut className='size-4' />}
					<span>{logoutMutation.isPending ? 'Logging out...' : 'Log Out'}</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
