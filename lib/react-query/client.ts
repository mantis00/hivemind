'use client'

import { QueryClient, QueryCache } from '@tanstack/react-query'
import { toast } from 'sonner'

export function makeQueryClient() {
	const queryCache = new QueryCache({
		onError: (error) => {
			if (error?.name === 'AuthSessionMissingError' || error?.name === 'AuthRetryableFetchError') return
			toast.error(`Query Failed: ${error.message}` || 'Failed to load data')
			console.error('Query Error:', error)
			// Only redirect on genuine auth errors (invalid/expired JWT), not network errors,
			// and only when not already on an auth page
			const isAuthPage = window.location.pathname.startsWith('/auth')
			const isRealAuthError =
				error.name === 'AuthApiError' &&
				(error.message?.toLowerCase().includes('jwt') ||
					error.message?.toLowerCase().includes('invalid') ||
					error.message?.toLowerCase().includes('expired') ||
					error.message?.toLowerCase().includes('unauthorized'))
			if (!isAuthPage && isRealAuthError) {
				window.location.href = '/auth/login'
			}
		}
	})

	return new QueryClient({
		queryCache,
		defaultOptions: {
			queries: {
				retry: 1,
				refetchOnWindowFocus: false,
				throwOnError: false
			},
			mutations: {
				onError: (error) => {
					// Skip network/retryable errors — these are transient, not auth failures
					if (error.name === 'AuthRetryableFetchError' || error.name === 'AuthSessionMissingError') return
					toast.error(`Mutation Failed: ${error.message}` || 'An error occurred')
					console.error('Mutation Error:', error)
					// Only redirect on genuine auth errors, and not when already on an auth page
					const isAuthPage = window.location.pathname.startsWith('/auth')
					const isRealAuthError =
						error.name === 'AuthApiError' &&
						(error.message?.toLowerCase().includes('jwt') ||
							error.message?.toLowerCase().includes('invalid') ||
							error.message?.toLowerCase().includes('expired') ||
							error.message?.toLowerCase().includes('unauthorized'))
					if (!isAuthPage && isRealAuthError) {
						window.location.href = '/auth/login'
					}
				}
			}
		}
	})
}

let browserQueryClient: QueryClient | undefined = undefined

export function getQueryClient() {
	if (typeof window === 'undefined') {
		// Server: always make a new query client
		return makeQueryClient()
	} else {
		// Browser: make a new query client if we don't already have one
		if (!browserQueryClient) browserQueryClient = makeQueryClient()
		return browserQueryClient
	}
}
