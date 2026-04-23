// ============================================================================
// User history table — shared constants, types, and defaults
// ============================================================================

export type UserActionFilters = {
	searchQuery: string
	actions: string[]
	entityTypes: string[]
	users: string[]
	dateFrom: string | null
	dateTo: string | null
}

export const DEFAULT_USER_ACTION_FILTERS: UserActionFilters = {
	searchQuery: '',
	actions: [],
	entityTypes: [],
	users: [],
	dateFrom: null,
	dateTo: null
}

export const USER_TABLE_DESKTOP_WIDTHS: Record<string, string> = {
	created_at: '115px',
	action: '90px',
	entity_type: '120px',
	entity_name: '180px',
	summary: '240px',
	actor_name: '130px'
}

export const USER_TABLE_MOBILE_WIDTHS: Record<string, string> = {
	created_at: '85px',
	action: '80px',
	entity_type: '100px',
	entity_name: '140px',
	summary: '180px',
	actor_name: '100px'
}
