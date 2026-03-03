'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ResponsiveDialogDrawer } from '../ui/dialog-to-drawer'
import { useState } from 'react'
import { useLogout } from '@/hooks/use-logout'

export function LogoutButton() {
	const router = useRouter()
	const [open, setOpen] = useState(false)

	const logout = useLogout()

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
			<Button variant='destructive' onClick={logout}>
				Logout
			</Button>
		</ResponsiveDialogDrawer>
	)
}
