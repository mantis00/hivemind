'use client'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '../ui/dialog-to-drawer'
import { useState } from 'react'
import { useLogout } from '@/lib/react-query/auth'

export function LogoutButton() {
	const [open, setOpen] = useState(false)

	const logoutMutation = useLogout()

	return (
		<ResponsiveDialogDrawer
			title='Log Out'
			description='Are you sure you want to log out?'
			open={open}
			onOpenChange={(isOpen) => setOpen(isOpen)}
			trigger={
				<Button variant='destructive' size='sm' className='w-auto px-4' onClick={() => setOpen(true)}>
					Logout
				</Button>
			}
		>
			<Button variant='outline' onClick={() => setOpen(false)}>
				Cancel
			</Button>
			<Button
				variant='destructive'
				onSelect={(e) => {
					e.preventDefault()
					logoutMutation.mutate()
				}}
			>
				Logout
			</Button>
		</ResponsiveDialogDrawer>
	)
}
