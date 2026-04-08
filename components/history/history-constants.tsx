import { type TimelineFilters, TimelineRecordType } from '@/lib/react-query/queries'

export const MAX_TABLE_HEIGHT_DESKTOP = 680
export const MAX_TABLE_HEIGHT_MOBILE = 560
export const TARGET_VISIBLE_ROWS_DESKTOP = 10
export const TARGET_VISIBLE_ROWS_MOBILE = 8
export const HEADER_HEIGHT = 49
export const ESTIMATED_ROW_HEIGHT_DESKTOP = 57.8
export const ESTIMATED_ROW_HEIGHT_MOBILE = 73

export const DEFAULT_FILTERS: TimelineFilters = {
	searchQuery: '',
	recordTypes: [],
	species: [],
	enclosures: [],
	users: [],
	taskTypes: [],
	dateFrom: null,
	dateTo: null
}

export const RECORD_TYPE_OPTIONS: { value: TimelineRecordType; label: string }[] = [
	{ value: 'task', label: 'Task Completion' },
	{ value: 'note', label: 'Note Creation' },
	{ value: 'count_change', label: 'Count Change' }
]

export const RECORD_TYPE_STYLES: Record<TimelineRecordType, string> = {
	task: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
	note: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
	count_change: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
}

export const RECORD_TYPE_LABELS: Record<TimelineRecordType, string> = {
	task: 'Task',
	note: 'Note',
	count_change: 'Count'
}

export const DESKTOP_COL_WIDTHS: Record<string, string> = {
	event_date: '115px',
	record_type: '90px',
	enclosure_name: '200px',
	species_name: '180px',
	summary: '200px',
	details: '200px',
	priority: '90px',
	time_window: '110px',
	user_name: '130px'
}

export const MOBILE_COL_WIDTHS: Record<string, string> = {
	event_date: '85px',
	record_type: '80px',
	enclosure_name: '130px',
	species_name: '130px',
	summary: '170px',
	details: '170px',
	priority: '80px',
	time_window: '100px',
	user_name: '90px'
}
