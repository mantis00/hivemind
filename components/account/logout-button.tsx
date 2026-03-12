'use client'

import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '../ui/dialog-to-drawer'
import { useState } from 'react'
import { useLogout } from '@/lib/react-query/auth'
import { LoaderCircle } from 'lucide-react'

export function LogoutButton() {
	const [open, setOpen] = useState(false)
	const [loading, setLoading] = useState(false)

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
			<Button
				variant='destructive'
				disabled={loading}
				onClick={(e) => {
					e.preventDefault()
					setLoading(true)
					logoutMutation.mutate()
				}}
			>
				{loading ? <LoaderCircle className='animate-spin' /> : 'Logout'}
			</Button>
		</ResponsiveDialogDrawer>
	)
}
