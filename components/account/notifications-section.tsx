'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, BellOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toaster } from '@/components/ui/sonner'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { usePushSubscriptionsForUser } from '@/lib/react-query/queries'
import { useSubscribeToPush, useUnsubscribeFromPush } from '@/lib/react-query/mutations'
import {
	ensurePushSubscription,
	getCurrentPushSubscription,
	getOrgIdFromPathname,
	getPushCapability,
	requestPushPermission
} from '@/context/push-subscription'

export function NotificationsSection() {
	const { data: user } = useCurrentClientUser()
	const pathname = usePathname()
	const orgId = getOrgIdFromPathname(pathname)

	const { data: activeSubscriptions } = usePushSubscriptionsForUser(user?.id)
	const subscribeMutation = useSubscribeToPush()
	const unsubscribeMutation = useUnsubscribeFromPush()

	const [canEnablePush, setCanEnablePush] = useState(false)
	const [requiresInstall, setRequiresInstall] = useState(false)
	const [deviceEndpoint, setDeviceEndpoint] = useState<string | null>(null)

	const isSubscribedOnThisDevice =
		!!deviceEndpoint && !!activeSubscriptions?.some((subscription) => subscription.endpoint === deviceEndpoint)
	const isBusy = subscribeMutation.isPending || unsubscribeMutation.isPending

	useEffect(() => {
		let cancelled = false

		const refreshDeviceStatus = async () => {
			if (typeof window === 'undefined') return

			const { supported, requiresInstall: needsInstall } = getPushCapability()
			if (cancelled) return

			setRequiresInstall(needsInstall)
			setCanEnablePush(supported && !needsInstall)

			if (!supported || needsInstall) {
				setDeviceEndpoint(null)
				return
			}

			const subscription = await getCurrentPushSubscription()
			if (cancelled) return
			setDeviceEndpoint(subscription?.endpoint ?? null)
		}

		refreshDeviceStatus().catch((err) => {
			console.error('Failed to load push subscription state:', err)
		})

		return () => {
			cancelled = true
		}
	}, [])

	const handleSubscribe = async () => {
		if (!user) return

		if (requiresInstall) {
			toaster.info(
				'On iPhone/iPad, install Hivemind to your Home Screen first, then enable notifications from the app.'
			)
			return
		}

		if (!canEnablePush) {
			toaster.error('Push notifications are not supported on this device/browser.')
			return
		}

		try {
			const permission = await requestPushPermission()
			if (permission !== 'granted') {
				toaster.error('Notification permission was not granted.')
				return
			}

			const existingSubscription = await getCurrentPushSubscription()

			let subscription = existingSubscription
			if (!subscription) {
				const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
				if (!vapidKey) throw new Error('Missing VAPID public key')
				subscription = await ensurePushSubscription(vapidKey)
			}
			const sub = subscription.toJSON()

			if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
				throw new Error('Invalid push subscription')
			}

			await subscribeMutation.mutateAsync({
				userId: user.id,
				orgId,
				endpoint: sub.endpoint,
				p256dh: sub.keys.p256dh,
				auth: sub.keys.auth
			})

			setDeviceEndpoint(sub.endpoint)
			toaster.success('Notifications enabled for this device.')
		} catch (err) {
			console.error('Push subscribe failed:', err)
			toaster.error('Could not enable notifications on this device yet. Please try again.')
		}
	}

	const handleUnsubscribe = async () => {
		if (!user) return

		try {
			const existingSubscription = await getCurrentPushSubscription()
			const endpointToDisable = existingSubscription?.endpoint ?? deviceEndpoint

			if (!endpointToDisable) {
				toaster.info('No active push subscription found on this device.')
				setDeviceEndpoint(null)
				return
			}

			await unsubscribeMutation.mutateAsync({
				userId: user.id,
				endpoint: endpointToDisable
			})

			setDeviceEndpoint(null)
			toaster.success('Notifications disabled for this device.')
		} catch (err) {
			console.error('Push unsubscribe failed:', err)
			toaster.error('Could not disable notifications right now. Please try again.')
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className='flex items-center gap-2 text-base'>
					<Bell className='h-4 w-4' /> Notifications
				</CardTitle>
				<CardDescription>Manage push notifications for this device</CardDescription>
			</CardHeader>
			<CardContent className='grid gap-5'>
				<div className='flex flex-wrap items-center justify-between gap-4'>
					<div className='flex items-center gap-3 min-w-0'>
						<div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted'>
							{isSubscribedOnThisDevice ? (
								<Bell className='h-4 w-4 text-muted-foreground' />
							) : (
								<BellOff className='h-4 w-4 text-muted-foreground' />
							)}
						</div>
						<div className='min-w-0'>
							<p className='text-sm font-medium'>Push notifications</p>
							<p className='text-sm text-muted-foreground truncate'>
								{requiresInstall
									? 'Install the app on your Home Screen to enable notifications on iPhone/iPad.'
									: isSubscribedOnThisDevice
										? 'Enabled on this device'
										: 'Not enabled on this device'}
							</p>
						</div>
					</div>

					{isSubscribedOnThisDevice ? (
						<Button variant='outline' onClick={handleUnsubscribe} disabled={isBusy}>
							{unsubscribeMutation.isPending ? 'Disabling...' : 'Disable'}
						</Button>
					) : (
						<Button onClick={handleSubscribe} disabled={isBusy || !canEnablePush}>
							{subscribeMutation.isPending ? 'Enabling...' : requiresInstall ? 'Install app first' : 'Enable'}
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
