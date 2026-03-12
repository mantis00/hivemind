import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { PostgrestError } from '@supabase/supabase-js'
import { UUID } from 'crypto'
import { useMemo } from 'react'
import { useCurrentClientUser } from '@/lib/react-query/auth'

export type Org = {
	org_id: UUID
	name: string
	created_at: string
}

export type UserOrg = {
	org_id: UUID
	access_lvl: number
	orgs: Org
}

export type OrgMember = {
	user_id: string
	access_lvl: number
	created_at: string
}

export type MemberProfile = {
	id: UUID
	first_name: string
	last_name: string
	email: string
	full_name: string
	is_superadmin: boolean
}

export type Invite = {
	invite_id: UUID
	org_id: UUID
	inviter_id: string
	invitee_email: string
	access_lvl: number
	status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
	created_at: string
	updated_at: string
	expires_at: string
	orgs?: {
		name: string
		org_id: UUID
	}
}

export type Enclosure = {
	id: UUID
	org_id: UUID
	species_id: UUID
	name: string
	created_at: string
	location: string
	current_count: number
	locations?: {
		name: string
	}
	Species: Species
}

export type Species = {
	id: UUID
	scientific_name: string
	common_name: string
	care_instructions: string
	created_at: string
	picture_url: string
}

export type OrgSpecies = {
	id: UUID
	created_at: string
	custom_common_name: string
	custom_care_instructions: string
	master_species_id: UUID
	species: {
		scientific_name: string
		common_name: string | null
		picture_url: string
	}
}

export type Location = {
	id: UUID
	org_id: number
	name: string
	description: string
	created_at: string
}

export type EnclosureNote = {
	id: UUID
	created_at: string
	enclosure_id: UUID
	user_id: UUID
	note_text: string
}

export type AllProfile = {
	id: UUID
	first_name: string
	last_name: string
	email: string
	full_name: string
	updated_at: string
	theme_preference: string | null
	is_superadmin: boolean
	user_org_role: {
		org_id: UUID
		access_lvl: number
		orgs: {
			name: string
		}
	}[]
}

export type OrgRequest = {
	request_id: UUID
	requester_id: string
	org_name: string
	status: 'pending' | 'approved' | 'rejected' | 'cancelled'
	created_at: string
	reviewed_by: string | null
	reviewed_at: string | null
}

export type Task = {
	id: UUID
	created_at: string
	enclosure_id: UUID
	name: string | null
	description: string | null
	status: string | null
	due_date: string | null
	priority: string | null
	completed_by: UUID | null
	completed_time: string | null
	template_id: UUID | null
	schedule_id: UUID | null
	time_window: string | null
	start_time: string | null
	time_to_completion: string | null
	assigned_to: UUID | null
}

export type DashboardKpis = {
	activeEnclosures: number
	tasksDueToday: number
	upcomingTasks: number
	alerts: number
}

export type AtRiskEnclosureSummary = {
	enclosureId: string
	enclosureName: string
	overdueCount: number
	highPriorityCount: number
	nextDueAt: string | null
}

export type UpcomingScheduleItem = {
	taskId: string
	enclosureId: string
	enclosureName: string
	taskTitle: string
	dueAt: string | null
	priority: string | null
}

export type RecentActivityItem = {
	id: string
	type: 'task_completed' | 'task_created' | 'note_added' | 'enclosure_created' | 'invite_sent'
	label: string
	occurredAt: string
	href: string
}

export type DashboardWarning = {
	stage: string
	message: string
}

export type DashboardData = {
	generatedAt: string
	timeZone: string
	kpis: DashboardKpis
	atRiskEnclosures: AtRiskEnclosureSummary[]
	upcomingSchedule: UpcomingScheduleItem[]
	recentActivity: RecentActivityItem[]
	warnings: DashboardWarning[]
}

export function useUserOrgs(userId: string) {
	return useQuery({
		queryKey: ['orgs', userId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('user_org_role')
				.select('org_id, access_lvl, orgs(name, org_id, created_at)')
				.eq('user_id', userId)) as { data: UserOrg[] | null; error: PostgrestError | null }

			if (error) throw error
			return data
		},
		enabled: !!userId
	})
}

export function useOrgMembers(orgId: UUID) {
	return useQuery({
		queryKey: ['orgMembers', orgId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('user_org_role')
				.select('user_id, access_lvl, created_at')
				.eq('org_id', orgId)
				.order('created_at', { ascending: true })) as { data: OrgMember[] | null; error: PostgrestError | null }

			if (error) throw error
			return data
		},
		enabled: !!orgId
	})
}

export function useIsOwnerOrSuperadmin(orgId: UUID | undefined): boolean {
	const { data: user } = useCurrentClientUser()
	const { data: orgMembers } = useOrgMembers(orgId as UUID)
	if (!user || !orgId) return false
	const accessLevel = orgMembers?.find((m) => m.user_id === user.id)?.access_lvl ?? 0
	return accessLevel >= 2
}

export function useMemberProfiles(userIds: string[]) {
	return useQuery({
		queryKey: ['profiles', userIds],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase.from('profiles').select('*').in('id', userIds)) as {
				data: MemberProfile[] | null
				error: PostgrestError | null
			}

			if (error) throw error

			if (userIds.length != data?.length) {
				throw new Error('Some profiles could not be found')
			}
			return data
		},
		enabled: userIds.length > 0
	})
}

export function usePendingInvites(userEmail: string) {
	return useQuery({
		queryKey: ['invites'],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('invites')
				.select('*, orgs(name, org_id)') // supabase pre configured to join orgs table by org_id
				.eq('invitee_email', userEmail)
				.eq('status', 'pending')
				.gt('expires_at', new Date().toISOString())
				.order('created_at', { ascending: false })) as { data: Invite[] | null; error: PostgrestError | null }

			if (error) throw error
			return data
		},
		enabled: !!userEmail
	})
}

export function useSentInvites(orgId: UUID) {
	return useQuery({
		queryKey: ['invites'],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('invites')
				.select('*')
				.eq('org_id', orgId)
				.order('created_at', { ascending: false })) as { data: Invite[] | null; error: PostgrestError | null }

			if (error) throw error
			return data
		},
		enabled: !!orgId
	})
}

export function useVerifyOrgMembership(userId: string, orgId: UUID) {
	return useQuery({
		queryKey: ['verifyOrgMembership', userId, orgId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('user_org_role')
				.select('user_id')
				.eq('user_id', userId)
				.eq('org_id', orgId)
				.maybeSingle()) as { data: { user_id: string } | null; error: PostgrestError | null }

			if (error) throw error
			return !!data
		},
		enabled: !!userId && !!orgId
	})
}

export function useOrgDetails(orgId: UUID) {
	return useQuery({
		queryKey: ['orgDetails', orgId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase.from('orgs').select('*').eq('org_id', orgId).maybeSingle()) as {
				data: Org | null
				error: PostgrestError | null
			}

			if (error) throw error
			return data
		},
		enabled: !!orgId
	})
}

export function useOrgEnclosures(orgId: UUID) {
	return useQuery({
		queryKey: ['orgEnclosures', orgId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('enclosures')
				.select('*, locations(name, description)')
				.eq('org_id', orgId)
				.order('current_count', { ascending: true })) as { data: Enclosure[] | null; error: PostgrestError | null }

			if (error) throw error
			return data
		},
		enabled: !!orgId
	})
}

export function useOrgEnclosureCount(orgId: UUID) {
	return useQuery({
		queryKey: ['orgEnclosureCount', orgId],
		queryFn: async () => {
			const supabase = createClient()
			const { count, error } = await supabase
				.from('enclosures')
				.select('*', { count: 'exact', head: true })
				.eq('org_id', orgId)

			if (error) throw error
			return count ?? 0
		},
		enabled: !!orgId
	})
}

export function useOrgEnclosure(orgId: number, enclosureId: number) {
	return useQuery({
		queryKey: ['enclosureId', enclosureId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('enclosures')
				.select('species_id, name, location, current_count')
				.eq('org_id', orgId)
				.eq('id', enclosureId)
				.order('current_count', { ascending: true })) as { data: Enclosure | null; error: PostgrestError | null }

			if (error) throw error
			return data
		},
		enabled: !!orgId
	})
}

export function useEnclosureById(enclosureId: UUID, orgId: UUID) {
	return useQuery({
		queryKey: ['enclosure', orgId, enclosureId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('enclosures')
				.select('*')
				.eq('id', enclosureId)
				.eq('org_id', orgId)
				.single()) as {
				data: Enclosure | null
				error: PostgrestError | null
			}

			if (error) throw error
			return data
		},
		enabled: !!enclosureId && !!orgId
	})
}

export function useSpecies(orgId: UUID) {
	return useQuery({
		queryKey: ['species'],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('org_species')
				.select('*, species(scientific_name, common_name, picture_url)')) as {
				data: OrgSpecies[] | null
				error: PostgrestError | null
			}
			if (error) throw error

			return data
		},
		enabled: !!orgId
	})
}

export function useOrgLocations(orgId: UUID) {
	return useQuery({
		queryKey: ['orgLocations', orgId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('locations')
				.select('id, name, description, created_at')
				.eq('org_id', orgId)) as { data: Location[] | null; error: PostgrestError | null }
			if (error) throw error

			if (data?.length && data?.length > 0) return data as Location[]
			return data
		},
		enabled: !!orgId
	})
}

export function useEnclosureNotes(enclosureId: UUID) {
	return useQuery({
		queryKey: ['enclosureNotes', enclosureId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('tank_notes')
				.select('id, user_id, note_text, created_at')
				.eq('enclosure_id', enclosureId)) as { data: EnclosureNote[] | null; error: PostgrestError | null }
			if (error) throw error

			return data
		},
		enabled: !!enclosureId
	})
}

export function useOrgEnclosuresForSpecies(orgId: UUID, speciesId: UUID) {
	return useQuery({
		queryKey: ['speciesEnclosures', orgId, speciesId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('enclosures')
				.select('id, org_id, name, location, current_count, locations(name, description), created_at')
				.eq('species_id', speciesId)
				.eq('org_id', orgId)) as { data: Enclosure[] | null; error: PostgrestError | null }
			if (error) throw error

			return data
		},
		enabled: !!orgId && !!speciesId
	})
}

export function useAllProfiles() {
	return useQuery({
		queryKey: ['allProfiles'],
		queryFn: async () => {
			const supabase = createClient()

			const { data, error } = (await supabase
				.from('profiles')
				.select('*, user_org_role(org_id, access_lvl, orgs(name))')
				.order('full_name', { ascending: true })) as { data: AllProfile[] | null; error: PostgrestError | null }

			if (error) throw error
			return data
		}
	})
}

export function useMyOrgRequests(userId: string) {
	return useQuery({
		queryKey: ['orgRequests', userId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('org_requests')
				.select('*')
				.eq('requester_id', userId)
				.order('created_at', { ascending: false })) as { data: OrgRequest[] | null; error: PostgrestError | null }

			if (error) throw error
			return data
		},
		enabled: !!userId
	})
}

export function useAllOrgRequests() {
	return useQuery({
		queryKey: ['allOrgRequests'],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('org_requests')
				.select('*')
				.order('created_at', { ascending: false })) as { data: OrgRequest[] | null; error: PostgrestError | null }

			if (error) throw error
			return data
		}
	})
}

export function useEnclosuresByIds(enclosureIds: UUID[]) {
	return useQuery({
		queryKey: ['enclosuresByIds', enclosureIds],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('enclosures')
				.select('id, org_id, species_id, name, location, current_count, locations(name, description), created_at')
				.in('id', enclosureIds)) as { data: Enclosure[] | null; error: PostgrestError | null }
			if (error) throw error
			return data
		},
		enabled: enclosureIds.length > 0
	})
}

export function useTasksForEnclosures(enclosureIds: UUID[]) {
	const enclosureFilterChunkSize = 100

	return useQuery({
		queryKey: ['tasksForEnclosures', enclosureIds],
		queryFn: async () => {
			if (enclosureIds.length === 0) {
				return []
			}

			const supabase = createClient()
			const uniqueEnclosureIds = Array.from(new Set(enclosureIds))
			const allTasks: Task[] = []

			for (let index = 0; index < uniqueEnclosureIds.length; index += enclosureFilterChunkSize) {
				const enclosureChunk = uniqueEnclosureIds.slice(index, index + enclosureFilterChunkSize)
				const { data, error } = (await supabase.from('tasks').select('*').in('enclosure_id', enclosureChunk)) as {
					data: Task[] | null
					error: PostgrestError | null
				}

				if (error) throw error
				if (data) {
					allTasks.push(...data)
				}
			}

			return allTasks
		},
		enabled: enclosureIds.length > 0
	})
}

export function useOneSpecies(master_species_id: UUID) {
	return useQuery({
		queryKey: ['singleSpecies', master_species_id],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase.from('species').select('*').eq('id', master_species_id).single()) as {
				data: Species | null
				error: PostgrestError | null
			}
			if (error) throw error
			return data
		},
		enabled: !!master_species_id
	})
}

export function useAllSpecies() {
	return useQuery({
		queryKey: ['allSpecies'],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('species')
				.select('*')
				.order('common_name', { ascending: true })) as { data: Species[] | null; error: PostgrestError | null }
			if (error) throw error
			return data
		}
	})
}

export type QuestionTemplate = {
	id: UUID
	task_template_id: UUID
	question_key: string
	label: string
	type: string
	required: boolean
	choices: string[] | null
	created_at: string
}

export type TaskTemplate = {
	id: UUID
	species_id: UUID
	type: string
	description: string | null
	created_at: string
	question_templates?: QuestionTemplate[]
}

export function useTaskTemplatesForSpecies(speciesId: UUID) {
	return useQuery({
		queryKey: ['taskTemplates', speciesId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = await supabase
				.from('task_templates')
				.select('*, question_templates(*)')
				.eq('species_id', speciesId)
				.order('created_at', { ascending: false })
			if (error) throw error
			return data as TaskTemplate[]
		},
		enabled: !!speciesId
	})
}

export function useUsedTaskTypesForSpecies(speciesId: UUID) {
	return useQuery({
		queryKey: ['usedTaskTypes', speciesId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = await supabase.from('task_templates').select('type').eq('species_id', speciesId)
			if (error) throw error
			return (data ?? []).map((t) => t.type) as string[]
		},
		enabled: !!speciesId
	})
}

export function useAllTaskTypes() {
	return useQuery({
		queryKey: ['allTaskTypes'],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = await supabase.from('task_templates').select('type')
			if (error) throw error
			return [...new Set((data ?? []).map((t) => t.type))].sort() as string[]
		}
	})
}

const DASHBOARD_OPEN_TASK_STATUSES = new Set(['pending', 'in_progress'])
const DASHBOARD_CLOSED_TASK_STATUS = 'completed'
const DASHBOARD_DEFAULT_TIME_ZONE = 'UTC'
const DASHBOARD_MAX_RECENT_ACTIVITY_ITEMS = 10

function createEmptyDashboardData(timeZone: string): DashboardData {
	return {
		generatedAt: new Date().toISOString(),
		timeZone,
		kpis: {
			activeEnclosures: 0,
			tasksDueToday: 0,
			upcomingTasks: 0,
			alerts: 0
		},
		atRiskEnclosures: [],
		upcomingSchedule: [],
		recentActivity: [],
		warnings: []
	}
}

function isValidTimeZone(timeZone: string) {
	try {
		new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
		return true
	} catch {
		return false
	}
}

function getClientTimeZone() {
	if (typeof window === 'undefined') {
		return DASHBOARD_DEFAULT_TIME_ZONE
	}

	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
	if (typeof timeZone === 'string' && timeZone.length > 0 && isValidTimeZone(timeZone)) {
		return timeZone
	}

	return DASHBOARD_DEFAULT_TIME_ZONE
}

function getDateKeyInTimeZone(date: Date, timeZone: string) {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(date)
}

function compareNullableIsoDatesAsc(a: string | null, b: string | null) {
	if (!a && !b) {
		return 0
	}
	if (!a) {
		return 1
	}
	if (!b) {
		return -1
	}
	return new Date(a).getTime() - new Date(b).getTime()
}

function compareIsoDatesDesc(a: string, b: string) {
	return new Date(b).getTime() - new Date(a).getTime()
}

function isValidDate(value: string | null) {
	if (!value) {
		return false
	}
	return !Number.isNaN(new Date(value).getTime())
}

function isTaskOpen(task: Task) {
	if (task.completed_time) {
		return false
	}

	if (!task.status) {
		return true
	}

	const normalized = task.status.trim().toLowerCase()
	if (normalized === DASHBOARD_CLOSED_TASK_STATUS) {
		return false
	}

	if (DASHBOARD_OPEN_TASK_STATUSES.has(normalized)) {
		return true
	}

	// Keep unknown statuses visible so old/test rows do not disappear silently.
	return true
}

function isHighPriority(priority: Task['priority']) {
	if (typeof priority !== 'string') {
		return false
	}
	return priority.trim().toLowerCase() === 'high'
}

function getTaskTitle(task: Task) {
	if (task.name && task.name.trim().length > 0) {
		return task.name.trim()
	}
	if (task.description && task.description.trim().length > 0) {
		return task.description.trim()
	}
	return 'Task'
}

function wasTaskOverdueWhenCompleted(task: Task) {
	if (!isValidDate(task.completed_time) || !isValidDate(task.due_date)) {
		return false
	}
	return new Date(task.completed_time!).getTime() > new Date(task.due_date!).getTime()
}

function getCompletionStateLabels(task: Task) {
	const labels: string[] = []
	if (wasTaskOverdueWhenCompleted(task)) {
		labels.push('overdue when completed')
	}
	if (isHighPriority(task.priority)) {
		labels.push('urgent when completed')
	}
	return labels
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error && error.message) {
		return error.message
	}
	return 'Unknown query error'
}

export function useDashboardData(orgId: UUID | undefined) {
	const timeZone = useMemo(() => getClientTimeZone(), [])

	const {
		data: enclosureCount,
		isLoading: isCountLoading,
		error: enclosureCountError
	} = useOrgEnclosureCount(orgId as UUID)
	const { data: enclosures, isLoading: isEnclosuresLoading, error: enclosuresError } = useOrgEnclosures(orgId as UUID)
	const enclosureIds = useMemo(() => (enclosures ?? []).map((enclosure) => enclosure.id as UUID), [enclosures])
	const { data: tasks, isLoading: isTasksLoading, error: tasksError } = useTasksForEnclosures(enclosureIds)

	const data = useMemo(() => {
		const dashboardData = createEmptyDashboardData(timeZone)
		const warnings = dashboardData.warnings

		if (enclosureCountError) {
			warnings.push({
				stage: 'enclosures.count',
				message: `Unable to load enclosure count (${getErrorMessage(enclosureCountError)}).`
			})
		}
		if (enclosuresError) {
			warnings.push({
				stage: 'enclosures.select',
				message: `Unable to load enclosure details (${getErrorMessage(enclosuresError)}).`
			})
		}
		if (tasksError) {
			warnings.push({
				stage: 'tasks.select',
				message: `Task metrics may be incomplete (${getErrorMessage(tasksError)}).`
			})
		}

		const activeEnclosures = enclosureCount ?? 0
		dashboardData.kpis.activeEnclosures = activeEnclosures

		const enclosureRows = enclosures ?? []
		if (activeEnclosures === 0 || enclosureRows.length === 0) {
			return dashboardData
		}

		const orgIdString = orgId ? String(orgId) : ''
		const enclosureNameById = new Map(
			enclosureRows.map((enclosure) => [String(enclosure.id), enclosure.name ?? String(enclosure.id)])
		)
		const taskRows = tasks ?? []
		const openTaskRows = taskRows.filter(isTaskOpen)
		const now = new Date()
		const todayKey = getDateKeyInTimeZone(now, timeZone)
		const upcomingDateKeys = new Set<string>()
		for (let dayOffset = 1; dayOffset <= 7; dayOffset += 1) {
			const futureDate = new Date(now)
			futureDate.setDate(futureDate.getDate() + dayOffset)
			upcomingDateKeys.add(getDateKeyInTimeZone(futureDate, timeZone))
		}

		const highPrioritySoonThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000)
		const alertTaskIds = new Set<string>()
		const riskByEnclosure = new Map<string, { overdueCount: number; highPriorityCount: number }>()
		const nextDueByEnclosure = new Map<string, string>()

		for (const task of openTaskRows) {
			const enclosureId = task.enclosure_id ? String(task.enclosure_id) : null
			if (!enclosureId || !isValidDate(task.due_date)) {
				continue
			}

			const dueDate = new Date(task.due_date!)
			const dueDateKey = getDateKeyInTimeZone(dueDate, timeZone)
			const dueDateIso = dueDate.toISOString()
			const previousNextDue = nextDueByEnclosure.get(enclosureId)
			if (!previousNextDue || compareNullableIsoDatesAsc(dueDateIso, previousNextDue) < 0) {
				nextDueByEnclosure.set(enclosureId, dueDateIso)
			}

			if (dueDateKey === todayKey) {
				dashboardData.kpis.tasksDueToday += 1
			}
			if (upcomingDateKeys.has(dueDateKey)) {
				dashboardData.kpis.upcomingTasks += 1
			}

			const isOverdue = dueDate < now
			const hasHighPriority = isHighPriority(task.priority)
			const isHighPrioritySoon = hasHighPriority && dueDate <= highPrioritySoonThreshold

			if (isOverdue || isHighPrioritySoon) {
				alertTaskIds.add(String(task.id))
			}

			if (isOverdue || hasHighPriority) {
				const currentStats = riskByEnclosure.get(enclosureId) ?? { overdueCount: 0, highPriorityCount: 0 }
				if (isOverdue) {
					currentStats.overdueCount += 1
				}
				if (hasHighPriority) {
					currentStats.highPriorityCount += 1
				}
				riskByEnclosure.set(enclosureId, currentStats)
			}
		}

		dashboardData.kpis.alerts = alertTaskIds.size
		dashboardData.atRiskEnclosures = Array.from(riskByEnclosure.entries())
			.map(([enclosureId, stats]) => ({
				enclosureId,
				enclosureName: enclosureNameById.get(enclosureId) ?? enclosureId,
				overdueCount: stats.overdueCount,
				highPriorityCount: stats.highPriorityCount,
				nextDueAt: nextDueByEnclosure.get(enclosureId) ?? null
			}))
			.sort((a, b) => {
				if (b.overdueCount !== a.overdueCount) {
					return b.overdueCount - a.overdueCount
				}
				if (b.highPriorityCount !== a.highPriorityCount) {
					return b.highPriorityCount - a.highPriorityCount
				}
				return compareNullableIsoDatesAsc(a.nextDueAt, b.nextDueAt)
			})
			.slice(0, 5)

		dashboardData.upcomingSchedule = openTaskRows
			.filter((task) => {
				if (!task.enclosure_id || !isValidDate(task.due_date)) {
					return false
				}
				const dueDateKey = getDateKeyInTimeZone(new Date(task.due_date!), timeZone)
				return dueDateKey === todayKey
			})
			.sort((a, b) => {
				const aUrgentSortOrder = isHighPriority(a.priority) ? 0 : 1
				const bUrgentSortOrder = isHighPriority(b.priority) ? 0 : 1
				if (aUrgentSortOrder !== bUrgentSortOrder) {
					return aUrgentSortOrder - bUrgentSortOrder
				}
				return compareNullableIsoDatesAsc(a.due_date, b.due_date)
			})
			.map((task) => {
				const enclosureId = String(task.enclosure_id)
				return {
					taskId: String(task.id),
					enclosureId,
					enclosureName: enclosureNameById.get(enclosureId) ?? enclosureId,
					taskTitle: getTaskTitle(task),
					dueAt: task.due_date,
					priority: typeof task.priority === 'string' ? task.priority : null
				}
			})

		const recentActivityCandidates: RecentActivityItem[] = []
		for (const task of taskRows) {
			const enclosureId = task.enclosure_id ? String(task.enclosure_id) : null
			const enclosureName = enclosureId ? (enclosureNameById.get(enclosureId) ?? 'Enclosure') : 'Enclosure'
			const taskTitle = getTaskTitle(task)
			const href = enclosureId
				? `/protected/orgs/${orgIdString}/enclosures/${enclosureId}`
				: `/protected/orgs/${orgIdString}`

			if (!isValidDate(task.completed_time)) {
				continue
			}

			const completedAt = task.completed_time!
			const completedDateKey = getDateKeyInTimeZone(new Date(completedAt), timeZone)
			if (completedDateKey !== todayKey) {
				continue
			}

			const completionStateLabels = getCompletionStateLabels(task)
			const completionStateSuffix = completionStateLabels.length > 0 ? ` (${completionStateLabels.join(', ')})` : ''

			recentActivityCandidates.push({
				id: `task-completed-${task.id}`,
				type: 'task_completed',
				label: `${taskTitle} completed in ${enclosureName}${completionStateSuffix}`,
				occurredAt: completedAt,
				href
			})
		}

		dashboardData.recentActivity = recentActivityCandidates
			.sort((a, b) => compareIsoDatesDesc(a.occurredAt, b.occurredAt))
			.slice(0, DASHBOARD_MAX_RECENT_ACTIVITY_ITEMS)

		dashboardData.generatedAt = now.toISOString()
		return dashboardData
	}, [enclosureCount, enclosures, tasks, orgId, timeZone, enclosureCountError, enclosuresError, tasksError])

	const criticalError = enclosureCountError ?? enclosuresError
	const loadError = criticalError ? getErrorMessage(criticalError) : null
	const isLoading = isCountLoading || isEnclosuresLoading || ((enclosures?.length ?? 0) > 0 && isTasksLoading)

	return { data, isLoading, loadError }
}
