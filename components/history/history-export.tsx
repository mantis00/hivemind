import { type EnclosureTimelineRow } from '@/lib/react-query/queries'
import { format } from 'date-fns'

export function exportToCsv(data: EnclosureTimelineRow[]) {
	const headers = [
		'Date',
		'Type',
		'Enclosure',
		'Species',
		'Summary',
		'Details',
		'User',
		'Priority',
		'Time Window',
		'Old Count',
		'New Count'
	]
	const rows = data.map((row) => [
		row.event_date,
		row.record_type,
		row.enclosure_name ?? '',
		row.species_name ?? '',
		row.summary ?? '',
		row.details ?? '',
		row.user_name ?? '',
		row.priority ?? '',
		row.time_window ?? '',
		row.old_count != null ? String(row.old_count) : '',
		row.new_count != null ? String(row.new_count) : ''
	])
	const csvContent = [headers, ...rows]
		.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
		.join('\n')
	const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = `hivemind-history-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
	link.click()
	URL.revokeObjectURL(url)
}
