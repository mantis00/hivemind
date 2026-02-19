'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ResponsiveDialogDrawer } from '../ui/dialog-to-drawer'
import { useState } from 'react'

export function LogoutButton() {
	const router = useRouter()
	const [open, setOpen] = useState(false)

	const logout = async () => {
		const supabase = createClient()
		await supabase.auth.signOut()
		router.replace('/auth/login') // replace, makes it so the cant click browser back button to go back to the previous page
	}

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
			<div className='py-2' />
			<Button variant='destructive' onClick={logout}>
				Logout
			</Button>
		</ResponsiveDialogDrawer>
	)
}
