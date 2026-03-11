import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function numberToAlphaCode(num: number): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
	let result = ''

	for (let i = 0; i < 4; i++) {
		result = chars[num % 26] + result
		num = Math.floor(num / 26)
	}

	return result
}
