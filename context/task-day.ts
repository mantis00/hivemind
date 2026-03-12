/** Returns a YYYY-MM-DD string for a date offset from today, in the client's local timezone */
export function getDateStr(dayOffset: number): string {
	const d = new Date()
	d.setDate(d.getDate() + dayOffset)
	const year = d.getFullYear()
	const month = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

export function getDayLabel(dayOffset: number): string {
	if (dayOffset === 0) return 'Today'
	if (dayOffset === -1) return 'Yesterday'
	if (dayOffset === 1) return 'Tomorrow'
	const d = new Date()
	d.setDate(d.getDate() + dayOffset)
	return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}
