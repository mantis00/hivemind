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

	let data: any
	try {
		data = event.data.json()
	} catch {
		try {
			const text = event.data.text()
			data = {
				title: 'Notification',
				body: text
			}
		} catch {
			data = {
				title: 'Notification',
				body: ''
			}
		}
	}

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

	const urlData = event.notification.data?.url
	let url = '/'

	if (typeof urlData === 'string' && urlData.trim() !== '') {
		try {
			const parsed = new URL(urlData, self.location.origin)

			if (parsed.origin === self.location.origin) {
				url = parsed.pathname + parsed.search + parsed.hash
			}
		} catch {
			// If parsing fails, keep the safe default '/'
		}
	}

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
