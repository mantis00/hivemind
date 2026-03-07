/** Returns a YYYY-MM-DD string for a date offset from today */
export function getDateStr(dayOffset: number): string {
	const d = new Date()
	d.setDate(d.getDate() + dayOffset)
	return d.toISOString().slice(0, 10)
}

export function getDayLabel(dayOffset: number): string {
	if (dayOffset === 0) return 'Today'
	if (dayOffset === -1) return 'Yesterday'
	if (dayOffset === 1) return 'Tomorrow'
	const d = new Date()
	d.setDate(d.getDate() + dayOffset)
	return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}
