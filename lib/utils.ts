import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

//for notifications but can be used anywhere else in the app as well
export function formatRelativeTime(iso: string, includeYear = false): string {
	const date = new Date(iso)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffMin = Math.floor(diffMs / 1000 / 60)
	const diffHour = Math.floor(diffMin / 60)
	const diffDay = Math.floor(diffHour / 24)

	if (diffMin < 1) return 'Just now'
	if (diffMin < 60) return `${diffMin}m ago`
	if (diffHour < 24) return `${diffHour}h ago`
	if (diffDay < 7) return `${diffDay}d ago`

	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		...(includeYear && { year: 'numeric' })
	})
}

export function getInitials(fullName?: string | null): string {
	if (!fullName) return '?'
	return fullName
		.split(' ')
		.map((w) => w[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}
