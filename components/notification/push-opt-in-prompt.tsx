'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Button } from '@/components/ui/button'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { useSubscribeToPush } from '@/lib/react-query/mutations'
import { toaster } from '@/components/ui/sonner'
import { UUID } from 'crypto'

interface PushOptInPromptProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function PushOptInPrompt({ open, onOpenChange }: PushOptInPromptProps) {
	const { data: user } = useCurrentClientUser()
	const subscribeMutation = useSubscribeToPush()
	const pathname = usePathname()

	const [canEnablePush, setCanEnablePush] = useState(false)
	const [requiresInstall, setRequiresInstall] = useState(false)
	const [dismissed, setDismissed] = useState(false)

	const orgMatch = pathname?.match(/^\/protected\/orgs\/([0-9a-fA-F-]{36})/)
	const orgId = orgMatch?.[1] ?? null

	/* Check browser support*/

	useEffect(() => {
		if (typeof window === 'undefined') return

		const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
		const ua = navigator.userAgent || ''
		const isAppleMobile = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document)
		const iosStandalone = isAppleMobile && !!(window.navigator as Navigator & { standalone?: boolean }).standalone
		const displayStandalone =
			typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches
		const installed = iosStandalone || displayStandalone
		const needsInstall = isAppleMobile && !installed

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

			const registration = await navigator.serviceWorker.getRegistration()
			if (!registration) return

			const existingSubscription = await registration.pushManager.getSubscription()
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
			toaster.info(
				'On iPhone/iPad, install Hivemind to your Home Screen first, then enable notifications from the app.'
			)
			return
		}

		if (!canEnablePush) return

		try {
			/* Request permission */

			let permission = Notification.permission

			if (permission === 'default') {
				permission = await Notification.requestPermission()
			}

			if (permission !== 'granted') {
				dismiss()
				return
			}

			/* Get existing service worker */

			const registration = await navigator.serviceWorker.ready

			/* Check for existing subscription */

			let subscription = await registration.pushManager.getSubscription()

			if (!subscription) {
				const vapidKey = process.env.VAPID_PUBLIC_KEY
				if (!vapidKey) throw new Error('Missing VAPID public key')

				subscription = await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: urlBase64ToUint8Array(vapidKey)
				})
			}

			/* Send subscription to backend */

			const sub = subscription.toJSON()

			if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
				throw new Error('Invalid push subscription')
			}

			await subscribeMutation.mutateAsync({
				userId: user.id,
				orgId: orgId ? (orgId as UUID) : null,
				endpoint: sub.endpoint,
				p256dh: sub.keys.p256dh,
				auth: sub.keys.auth
			})

			dismiss()
		} catch (err) {
			console.error('Push subscription failed:', err)
			if (err instanceof Error && err.name === 'NotAllowedError') {
				toaster.error('Notifications are blocked. Enable notifications in browser/site settings and try again.')
				return
			}

			toaster.error('Could not enable notifications on this device yet. Please try again.')
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

/* VAPID helper*/

function urlBase64ToUint8Array(base64String: string) {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

	const rawData = window.atob(base64)
	return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}
