import { useSyncExternalStore } from 'react'

/**
 * Returns `false` during SSR / hydration and `true` once the component has
 * mounted on the client. Avoids the anti-pattern of calling `setState`
 * synchronously inside a `useEffect`.
 */
export function useIsMounted() {
	return useSyncExternalStore(
		() => () => {},
		() => true,
		() => false
	)
}
