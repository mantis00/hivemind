/** Converts any ISO date/timestamp to a local YYYY-MM-DD string using the browser's clock. */
export function toLocalDate(iso: string): string {
	const d = new Date(iso)
	const year = d.getFullYear()
	const month = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}
