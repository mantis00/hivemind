'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Button } from '@/components/ui/button'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { useSubscribeToPush } from '@/lib/react-query/mutations'
import { toast } from 'sonner'
import {
	ensurePushSubscription,
	getCurrentPushSubscription,
	getPushCapability,
	requestPushPermission
} from '@/context/push-subscription'

interface PushOptInPromptProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function PushOptInPrompt({ open, onOpenChange }: PushOptInPromptProps) {
	const { data: user } = useCurrentClientUser()
	const subscribeMutation = useSubscribeToPush()

	const [canEnablePush, setCanEnablePush] = useState(false)
	const [requiresInstall, setRequiresInstall] = useState(false)
	const [dismissed, setDismissed] = useState(false)

	/* Check browser support*/

	useEffect(() => {
		if (typeof window === 'undefined') return

		const { supported, requiresInstall: needsInstall } = getPushCapability()

		setRequiresInstall(needsInstall)
		setCanEnablePush(supported && !needsInstall)

		if (sessionStorage.getItem('pushPromptDismissed') === 'true') {
			setDismissed(true)
		}
	}, [])

	useEffect(() => {
		if (typeof window === 'undefined') return
		if (!canEnablePush) return

		let isCancelled = false

		const suppressIfAlreadyEnabled = async () => {
			if (Notification.permission !== 'granted') return

			const existingSubscription = await getCurrentPushSubscription()
			if (!existingSubscription || isCancelled) return

			sessionStorage.setItem('pushPromptDismissed', 'true')
			setDismissed(true)
			onOpenChange(false)
		}

		suppressIfAlreadyEnabled().catch((err) => {
			console.error('Failed to check existing push subscription:', err)
		})

		return () => {
			isCancelled = true
		}
	}, [canEnablePush, onOpenChange])

	/* Dismiss prompt*/

	const dismiss = () => {
		sessionStorage.setItem('pushPromptDismissed', 'true')
		setDismissed(true)
		onOpenChange(false)
	}

	/* Enable notifications*/

	const handleEnable = async () => {
		if (!user) return

		if (requiresInstall) {
			toast.info('On iPhone/iPad, install Hivemind to your Home Screen first, then enable notifications from the app.')
			return
		}

		if (!canEnablePush) return

		/* Request permission */

		const permission = await requestPushPermission()

		if (permission !== 'granted') {
			dismiss()
			return
		}

		/* Get existing service worker */

		try {
			const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
			if (!vapidKey) throw new Error('Missing VAPID public key')

			const subscription = await ensurePushSubscription(vapidKey)

			/* Send subscription to backend */

			const sub = subscription.toJSON()

			if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
				throw new Error('Invalid push subscription')
			}

			await subscribeMutation.mutateAsync({
				userId: user.id,
				endpoint: sub.endpoint,
				p256dh: sub.keys.p256dh,
				auth: sub.keys.auth
			})

			dismiss()
		} catch (err) {
			console.error('Push subscription failed:', err)

			if (err instanceof Error && err.name === 'NotAllowedError') {
				toast.error('Notifications are blocked. Enable notifications in browser/site settings and try again.')
				return
			}

			toast.error('Could not enable notifications on this device yet. Please try again.')
		}
	}

	/* Render guard*/

	if ((!canEnablePush && !requiresInstall) || !open || dismissed) return null

	return (
		<ResponsiveDialogDrawer
			title='Enable Notifications'
			description={
				requiresInstall
					? 'On iPhone/iPad, web push only works after installing Hivemind to your Home Screen and opening it there.'
					: 'Get alerts, invites, and important updates delivered to your device.'
			}
			trigger={null}
			open={open}
			onOpenChange={onOpenChange}
		>
			<Button variant='outline' onClick={dismiss}>
				Not now
			</Button>

			<Button onClick={handleEnable} disabled={subscribeMutation.isPending || !canEnablePush}>
				{subscribeMutation.isPending ? 'Enabling...' : requiresInstall ? 'Install app first' : 'Enable notifications'}
				<Bell className='ml-2 size-4' />
			</Button>
		</ResponsiveDialogDrawer>
	)
}
