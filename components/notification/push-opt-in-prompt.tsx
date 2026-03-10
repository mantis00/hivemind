'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Button } from '@/components/ui/button'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { useSubscribeToPush } from '@/lib/react-query/mutations'
import { Bell } from 'lucide-react'

interface PushOptInPromptProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function PushOptInPrompt({ open, onOpenChange }: PushOptInPromptProps) {
	const { data: user } = useCurrentClientUser()
	const subscribeMutation = useSubscribeToPush()
	const pathname = usePathname()
	const [dismissed, setDismissed] = useState(false)
	const [isSupported, setIsSupported] = useState(false)

	const pathname_match = pathname?.match(/^\/protected\/orgs\/([0-9a-fA-F-]{36})/)
	const orgId = pathname_match?.[1] ?? null

	// Check browser support
	useEffect(() => {
		const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
		setIsSupported(supported)
	}, [])

	// Check if already dismissed this session
	useEffect(() => {
		const isDismissed = sessionStorage.getItem('pushPromptDismissed') === 'true'
		setDismissed(isDismissed)
	}, [])

	const handleDismiss = () => {
		sessionStorage.setItem('pushPromptDismissed', 'true')
		setDismissed(true)
		onOpenChange(false)
	}

	const handleEnable = async () => {
		if (!user || !isSupported) return

		try {
			// Check current permission
			let permission = Notification.permission
			if (permission === 'default') {
				// Request permission from user
				permission = await Notification.requestPermission()
			}

			if (permission !== 'granted') {
				handleDismiss()
				return
			}

			// Get service worker registration
			const registration = await navigator.serviceWorker.ready

			// Subscribe to push notifications
			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
					? urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
					: undefined
			})

			const subscriptionJson = subscription.toJSON()
			if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
				throw new Error('Invalid subscription object')
			}

			// Save to database via mutation
			await subscribeMutation.mutateAsync({
				userId: user.id,
				orgId: orgId as any,
				endpoint: subscriptionJson.endpoint,
				p256dh: subscriptionJson.keys.p256dh,
				auth: subscriptionJson.keys.auth
			})

			handleDismiss()
		} catch (error) {
			console.error('Failed to subscribe to push notifications:', error)
		}
	}

	// Don't show if not supported, already dismissed, or already subscribed
	if (!isSupported || dismissed || !open) {
		return null
	}

	return (
		<ResponsiveDialogDrawer
			title='Enable Notifications'
			description='Get updates about alerts, invites, and important changes delivered right to your device.'
			trigger={null}
			open={open}
			onOpenChange={onOpenChange}
		>
			<Button variant='outline' onClick={handleDismiss}>
				Not now
			</Button>
			<Button onClick={handleEnable} disabled={subscribeMutation.isPending}>
				{subscribeMutation.isPending ? 'Enabling...' : 'Enable notifications'}
				<Bell className='ml-2 size-4' />
			</Button>
		</ResponsiveDialogDrawer>
	)
}

// Helper to convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
	const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')

	const rawData = window.atob(base64)
	const outputArray = new Uint8Array(rawData.length)

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i)
	}
	return outputArray
}
