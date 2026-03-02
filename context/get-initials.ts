export function getInitials(fullName?: string | null): string {
	if (!fullName) return '?'
	return fullName
		.split(' ')
		.map((w) => w[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}
