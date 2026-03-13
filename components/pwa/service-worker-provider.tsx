'use client'

import { useEffect } from 'react'

export function ServiceWorkerProvider() {
	useEffect(() => {
		if (!('serviceWorker' in navigator)) return

		navigator.serviceWorker.getRegistration().then((existing) => {
			if (existing) {
				if (process.env.NODE_ENV !== 'production') {
					console.log('Service Worker already registered:', existing.scope)
				}
				return
			}

			navigator.serviceWorker
				.register('/sw.js')
				.then((registration) => {
					if (process.env.NODE_ENV !== 'production') {
						console.log('Service Worker registered:', registration.scope)
					}
				})
				.catch((err) => {
					if (process.env.NODE_ENV !== 'production') {
						console.error('Service Worker registration failed:', err)
					}
				})
		})
	}, [])

	return null
}
