import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
	interface WorkerGlobalScope extends SerwistGlobalConfig {
		__SW_MANIFEST: (PrecacheEntry | string)[] | undefined
	}
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
	precacheEntries: self.__SW_MANIFEST,
	skipWaiting: true,
	clientsClaim: true,
	navigationPreload: true,
	fallbacks: {
		entries: [
			{
				url: '/~offline',
				matcher({ request }) {
					return request.destination === 'document'
				}
			}
		]
	}
})

self.addEventListener('push', (event) => {
	if (!event.data) return

	const data = event.data.json()

	event.waitUntil(
		self.registration.showNotification(data.title ?? 'Notification', {
			body: data.body ?? '',
			icon: '/icons/icon-192x192.png',
			badge: '/icons/icon-192x192.png',
			data: {
				notificationId: data.id,
				url: data.url
			}
		})
	)
})

self.addEventListener('notificationclick', (event) => {
	event.notification.close()

	const url = event.notification.data?.url || '/'

	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
			for (const client of clients) {
				if ('focus' in client) {
					client.navigate(url)
					return client.focus()
				}
			}

			return self.clients.openWindow(url)
		})
	)
})

serwist.addEventListeners()
