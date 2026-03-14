export function getPushCapability() {
	if (typeof window === 'undefined') {
		return { supported: false, requiresInstall: false }
	}

	const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
	const ua = navigator.userAgent || ''
	const isAppleMobile = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document)
	const iosStandalone = isAppleMobile && !!(window.navigator as Navigator & { standalone?: boolean }).standalone
	const displayStandalone =
		typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches
	const installed = iosStandalone || displayStandalone
	const requiresInstall = isAppleMobile && !installed

	return { supported, requiresInstall }
}

export async function requestPushPermission() {
	if (typeof window === 'undefined' || !('Notification' in window)) return 'denied' as const
	if (Notification.permission === 'default') return Notification.requestPermission()
	return Notification.permission
}

export async function getCurrentPushSubscription() {
	if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null

	const registration = await navigator.serviceWorker.getRegistration()
	if (!registration) return null

	return registration.pushManager.getSubscription()
}

export async function ensurePushSubscription(vapidPublicKey: string) {
	if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
		throw new Error('Service workers are not available')
	}

	const registration = await navigator.serviceWorker.ready
	let subscription = await registration.pushManager.getSubscription()

	if (!subscription) {
		subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
		})
	}

	return subscription
}

export async function unsubscribeCurrentPushSubscription() {
	const subscription = await getCurrentPushSubscription()
	if (!subscription) return null

	const endpoint = subscription.endpoint
	await subscription.unsubscribe()
	return endpoint
}

function urlBase64ToUint8Array(base64String: string) {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

	const rawData = window.atob(base64)
	return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}
