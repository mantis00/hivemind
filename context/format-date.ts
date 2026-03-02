const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Formats an ISO timestamp using the user's local timezone.
 * @param iso       ISO 8601 date string
 * @param includeYear  Whether to include the year (default true)
 */
export function formatDate(iso: string, includeYear = true): string {
	if (!iso) return '—'
	const d = new Date(iso)
	const month = MONTHS[d.getMonth()]
	const day = d.getDate()
	if (!includeYear) return `${month} ${day}`
	return `${month} ${day}, ${d.getFullYear()}`
}
