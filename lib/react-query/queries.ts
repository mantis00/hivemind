import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { PostgrestError } from '@supabase/supabase-js'
import { UUID } from 'crypto'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import {
	DASHBOARD_MAX_AT_RISK_ITEMS,
	DASHBOARD_MAX_RECENT_ACTIVITY_ITEMS,
	compareIsoDatesDesc,
	compareNullableIsoDatesAsc,
	getCompletionStateLabels,
	getDashboardTaskEnclosure,
	getServerDayBounds,
	getTaskTitle,
	isHighPriority,
	isValidDate
} from '@/components/features/dashboard/dashboard-helpers'

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
	is_active: boolean
	name: string
	created_at: string
	location: UUID
	current_count: number
	printed?: boolean
	locations?: {
		name: string
	}
	Species: Species
	institutional_specimen_id: string
	institutional_external_source: string
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
	is_active: boolean
	custom_common_name: string
	custom_care_instructions: string
	master_species_id: UUID
	species: {
		scientific_name: string
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
	user?: {
		first_name: string
		last_name: string
	}
	is_flagged: boolean
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
	status: 'completed' | 'pending' | 'late' | null
	due_date: string | null
	priority: 'low' | 'medium' | 'high' | null
	completed_by: UUID | null
	completed_time: string | null
	template_id: UUID | null
	form_data: Record<string, unknown> | null
	schedule_id: UUID | null
	time_window: string | null
	start_time: string | null
	time_to_completion: string | null
	assigned_to: UUID | null
	task_templates?: { type: string; description: string | null } | null
}

export type EnclosureSchedule = {
	id: UUID
	created_at: string
	enclosure_id: UUID
	template_id: UUID | null
	schedule_type: 'fixed_calendar' | 'relative_interval'
	schedule_rule: string
	time_window: 'Morning' | 'Afternoon' | 'Any' | null
	is_active: boolean
	status: 'completed' | 'pending' | 'late' | null
	last_run_at: string | null
	task_name: string | null
	task_description: string | null
	priority: 'low' | 'medium' | 'high' | null
	assigned_to: UUID | null
	start_date: string | null
	end_date: string | null
	max_occurrences: number | null
	occurrence_count: number
	advance_task_count: number
}

export type TaskFormData = {
	id: UUID
	task_id: UUID
	question_id: UUID
	answer: string | null
	created_at: string
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
	order: number
}

export type TaskTemplate = {
	id: UUID
	species_id: UUID
	type: string
	description: string | null
	created_at: string
	is_active: boolean
	question_templates?: QuestionTemplate[]
}

export type Notification = {
	id: UUID
	created_at: string
	recipient_id: string
	sender_id: string
	org_id: UUID
	type: string
	title: string
	description: string
	href: string
	viewed: boolean
	viewed_at: string | null
}

export type SpeciesRequest = {
	id: UUID
	created_at: string
	requester_id: string
	org_id: UUID
	scientific_name: string
	common_name: string
	reviewer_id?: string
	care_instructions: string
	status: 'pending' | 'approved' | 'rejected' | 'cancelled'
	reviewed_at?: string
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

export type DashboardAtRiskData = {
	items: AtRiskEnclosureSummary[]
	attentionNeededCount: number
}

type DashboardTaskRow = {
	id: UUID
	enclosure_id: UUID | null
	name: string | null
	description: string | null
	due_date: string | null
	priority: string | null
	status: string | null
	completed_time: string | null
	enclosures: { id: UUID; name: string | null } | { id: UUID; name: string | null }[] | null
}

export type PushSubscription = {
	id: UUID
	user_id: string
	endpoint: string
	p256dh: string
	auth: string
	created_at: string
	user_agent: string | null
	last_used_at: string | null
	is_active: boolean
}

export type EnclosureLineage = {
	id: UUID
	enclosure_id: UUID
	source_enclosure_id: UUID
	created_at: string
}

export type EnclosureCouuntHistory = {
	id: UUID
	enclosure_id: UUID
	old_count: number
	new_count: number
	changed_by: UUID
	changed_at: string
}

export function useEnclosureLineage(enclosureId: UUID) {
	return useQuery({
		queryKey: ['enclosureLineage', enclosureId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = await supabase
				.from('enclosure_lineage')
				.select('id, enclosure_id, source_enclosure_id, created_at')
				.eq('enclosure_id', enclosureId)
			if (error) throw error
			return data as EnclosureLineage[]
		},
		enabled: !!enclosureId
	})
}

export function useOrgEnclosureLineage(orgId: UUID) {
	return useQuery({
		queryKey: ['orgEnclosureLineage', orgId],
		queryFn: async () => {
			const supabase = createClient()
			const { data: orgEncs, error: encError } = await supabase.from('enclosures').select('id').eq('org_id', orgId)
			if (encError) throw encError
			const ids = (orgEncs ?? []).map((e) => e.id)
			if (ids.length === 0) return []
			const { data, error } = await supabase
				.from('enclosure_lineage')
				.select('id, enclosure_id, source_enclosure_id, created_at')
				.in('enclosure_id', ids)
			if (error) throw error
			return data as EnclosureLineage[]
		},
		enabled: !!orgId
	})
}

export function useUserOrgs(userId: string) {
	return useQuery({
		queryKey: ['orgs'],
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

export function useOrgEnclosures(orgId: UUID, enclosureStatus: 'active' | 'inactive' | 'all' = 'active') {
	return useQuery({
		queryKey: ['orgEnclosures', orgId, enclosureStatus],
		queryFn: async () => {
			const supabase = createClient()
			const PAGE_SIZE = 1000
			const allEnclosures: Enclosure[] = []
			let from = 0

			const { data: activeSpecies, error: activeSpeciesError } = await supabase
				.from('org_species')
				.select('id')
				.eq('org_id', orgId)
				.eq('is_active', true)

			if (activeSpeciesError) throw activeSpeciesError

			const activeSpeciesIds = (activeSpecies ?? []).map((s) => s.id)
			if (activeSpeciesIds.length === 0) return []

			while (true) {
				let enclosureQuery = supabase
					.from('enclosures')
					.select('*, locations(name, description)')
					.eq('org_id', orgId)
					.in('species_id', activeSpeciesIds)

				if (enclosureStatus !== 'all') {
					enclosureQuery = enclosureQuery.eq('is_active', enclosureStatus === 'active')
				}

				const { data, error } = (await enclosureQuery
					.order('current_count', { ascending: true })
					.range(from, from + PAGE_SIZE - 1)) as { data: Enclosure[] | null; error: PostgrestError | null }

				if (error) throw error
				allEnclosures.push(...(data ?? []))
				if ((data?.length ?? 0) < PAGE_SIZE) break
				from += PAGE_SIZE
			}

			return allEnclosures
		},
		enabled: !!orgId
	})
}

export function useOrgEnclosureCount(orgId: UUID) {
	return useQuery({
		queryKey: ['orgEnclosureCount', orgId],
		queryFn: async () => {
			const supabase = createClient()

			const { data: activeSpecies, error: activeSpeciesError } = await supabase
				.from('org_species')
				.select('id')
				.eq('org_id', orgId)
				.eq('is_active', true)

			if (activeSpeciesError) throw activeSpeciesError

			const activeSpeciesIds = (activeSpecies ?? []).map((s) => s.id)
			if (activeSpeciesIds.length === 0) return 0

			const { count, error } = await supabase
				.from('enclosures')
				.select('*', { count: 'exact', head: true })
				.eq('org_id', orgId)
				.in('species_id', activeSpeciesIds)

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
				.select('*, species(scientific_name, picture_url)')
				.eq('is_active', true)) as {
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
			const { data: notes, error } = (await supabase
				.from('tank_notes')
				.select('id, user_id, note_text, created_at, enclosure_id, is_flagged')
				.eq('enclosure_id', enclosureId)
				.order('created_at', { ascending: false })) as { data: EnclosureNote[] | null; error: PostgrestError | null }
			if (error) throw error
			if (!notes || notes.length === 0) return notes

			const userIds = [...new Set(notes.map((n) => n.user_id).filter(Boolean))]
			const { data: profiles, error: profilesError } = await supabase
				.from('profiles')
				.select('id, first_name, last_name')
				.in('id', userIds)
			if (profilesError) throw profilesError

			const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? [])
			return notes.map((note) => ({
				...note,
				user: profileMap.get(note.user_id) ?? undefined
			})) as EnclosureNote[]
		},
		enabled: !!enclosureId
	})
}

export function useNotifications(recipientId: string) {
	return useQuery({
		queryKey: ['notifications', recipientId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('notifications')
				.select('*')
				.eq('recipient_id', recipientId)
				.order('created_at', { ascending: false })) as { data: Notification[] | null; error: PostgrestError | null }
			if (error) throw error

			return data
		},
		enabled: !!recipientId
	})
}

export function useLiveNotificationsRealtime(recipientId: string | undefined) {
	return useQuery({
		queryKey: ['live-notifications-realtime', recipientId],
		enabled: !!recipientId,
		staleTime: Infinity,

		queryFn: async ({ queryKey, client }) => {
			const [, recipientId] = queryKey
			const supabase = createClient()

			const channel = supabase
				.channel(`notifications-${recipientId}`)
				.on(
					'postgres_changes',
					{
						event: 'INSERT',
						schema: 'public',
						table: 'notifications',
						filter: `recipient_id=eq.${recipientId}`
					},
					(payload) => {
						const newNotification = payload.new as Notification

						client.setQueryData(['notifications', recipientId], (old: Notification[] | undefined) => {
							if (!old) return [newNotification]

							// prepend the new notification to the cache
							return [newNotification, ...old.filter((n) => n.id !== newNotification.id)]
						})
					}
				)
				.subscribe()

			const unsubscribe = client.getQueryCache().subscribe((event) => {
				if (event.type === 'removed') {
					supabase.removeChannel(channel)
					unsubscribe()
				}
			})

			return channel
		}
	})
}

export function useOrgEnclosuresForSpecies(
	orgId: UUID,
	speciesId: UUID,
	enclosureStatus: 'active' | 'inactive' | 'all' = 'active'
) {
	return useQuery({
		queryKey: ['speciesEnclosures', orgId, speciesId, enclosureStatus],
		queryFn: async () => {
			const supabase = createClient()

			const { data: activeSpecies, error: activeSpeciesError } = await supabase
				.from('org_species')
				.select('id')
				.eq('id', speciesId)
				.eq('org_id', orgId)
				.eq('is_active', true)
				.maybeSingle()

			if (activeSpeciesError) throw activeSpeciesError
			if (!activeSpecies) return []

			let enclosureQuery = supabase
				.from('enclosures')
				.select(
					'id, org_id, species_id, is_active, name, location, current_count, printed, locations(name, description), created_at, institutional_specimen_id, institutional_external_source'
				)
				.eq('species_id', speciesId)
				.eq('org_id', orgId)

			if (enclosureStatus !== 'all') {
				enclosureQuery = enclosureQuery.eq('is_active', enclosureStatus === 'active')
			}

			const { data, error } = (await enclosureQuery) as { data: Enclosure[] | null; error: PostgrestError | null }
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
	return useQuery({
		queryKey: ['tasksForEnclosures', enclosureIds],
		queryFn: async () => {
			const supabase = createClient()
			const CHUNK_SIZE = 200
			const PAGE_SIZE = 1000

			const chunks: UUID[][] = []
			for (let i = 0; i < enclosureIds.length; i += CHUNK_SIZE) {
				chunks.push(enclosureIds.slice(i, i + CHUNK_SIZE))
			}

			const chunkResults = await Promise.all(
				chunks.map(async (chunk) => {
					const tasks: Task[] = []
					let from = 0
					while (true) {
						const { data, error } = (await supabase
							.from('tasks')
							.select('*, task_templates(type, description)')
							.in('enclosure_id', chunk)
							.range(from, from + PAGE_SIZE - 1)) as { data: Task[] | null; error: PostgrestError | null }

						if (error) throw error
						tasks.push(...(data ?? []))
						if ((data?.length ?? 0) < PAGE_SIZE) break
						from += PAGE_SIZE
					}
					return tasks
				})
			)

			return chunkResults.flat()
		},
		enabled: enclosureIds.length > 0
	})
}

export function useTasksForEnclosuresInRange(enclosureIds: UUID[], startDate: string, endDate: string) {
	return useQuery({
		queryKey: ['tasksForEnclosuresInRange', enclosureIds, startDate, endDate],
		queryFn: async () => {
			const supabase = createClient()
			const CHUNK_SIZE = 200
			const PAGE_SIZE = 1000

			const chunks: UUID[][] = []
			for (let i = 0; i < enclosureIds.length; i += CHUNK_SIZE) {
				chunks.push(enclosureIds.slice(i, i + CHUNK_SIZE))
			}

			const chunkResults = await Promise.all(
				chunks.map(async (chunk) => {
					const tasks: Task[] = []
					let from = 0
					while (true) {
						// Compute the exclusive upper bound (day after endDate) so that all
						// timestamps on the end date are included regardless of time component.
						const endDateExclusive = (() => {
							const d = new Date(endDate + 'T00:00:00Z')
							d.setUTCDate(d.getUTCDate() + 1)
							return d.toISOString().slice(0, 10)
						})()
						const { data, error } = (await supabase
							.from('tasks')
							.select('*, task_templates(type, description)')
							.in('enclosure_id', chunk)
							.gte('due_date', startDate)
							.lt('due_date', endDateExclusive)
							.order('due_date', { ascending: true })
							.range(from, from + PAGE_SIZE - 1)) as { data: Task[] | null; error: PostgrestError | null }

						if (error) throw error
						tasks.push(...(data ?? []))
						if ((data?.length ?? 0) < PAGE_SIZE) break
						from += PAGE_SIZE
					}
					return tasks
				})
			)

			return chunkResults.flat()
		},
		enabled: enclosureIds.length > 0 && !!startDate && !!endDate
	})
}

export function useTaskName(taskId: UUID) {
	return useQuery({
		queryKey: ['task', taskId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase.from('tasks').select('name').eq('id', taskId).maybeSingle()) as {
				data: { name: string } | null
				error: PostgrestError | null
			}
			if (error) throw error
			return data?.name ?? null
		},
		enabled: !!taskId
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
			const { data, error } = await supabase
				.from('task_templates')
				.select('type')
				.eq('species_id', speciesId)
				.eq('is_active', true)
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

export function useTaskTemplatesForOrgSpecies(orgSpeciesId: UUID) {
	return useQuery({
		queryKey: ['taskTemplatesForOrgSpecies', orgSpeciesId],
		queryFn: async () => {
			const supabase = createClient()
			// Resolve org_species → master_species_id
			const { data: orgSpecies, error: orgSpeciesError } = await supabase
				.from('org_species')
				.select('master_species_id')
				.eq('id', orgSpeciesId)
				.single()
			if (orgSpeciesError) throw orgSpeciesError
			if (!orgSpecies) return []

			// Fetch templates for that master species — no question_templates needed here
			const { data, error } = await supabase
				.from('task_templates')
				.select('id, type, description, created_at')
				.eq('species_id', orgSpecies.master_species_id)
				.eq('is_active', true)
				.order('type', { ascending: true })
			if (error) throw error
			return (data ?? []) as { id: UUID; type: string; description: string | null; created_at: string }[]
		},
		enabled: !!orgSpeciesId
	})
}

export function useOrgMemberProfiles(orgId: UUID) {
	return useQuery({
		queryKey: ['orgMemberProfiles', orgId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('user_org_role')
				.select('user_id, access_lvl, profiles(id, first_name, last_name, full_name, email)')
				.eq('org_id', orgId)
				.order('created_at', { ascending: true })) as {
				data: { user_id: string; access_lvl: number; profiles: MemberProfile }[] | null
				error: PostgrestError | null
			}
			if (error) throw error
			return (data ?? []).map((row) => row.profiles).filter(Boolean) as MemberProfile[]
		},
		enabled: !!orgId
	})
}

export function useTaskById(taskId: UUID) {
	return useQuery({
		queryKey: ['taskById', taskId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase.from('tasks').select('*').eq('id', taskId).single()) as {
				data: Task | null
				error: PostgrestError | null
			}
			if (error) throw error
			return data
		},
		enabled: !!taskId
	})
}

export function useTaskFormAnswers(taskId: UUID) {
	return useQuery({
		queryKey: ['taskFormAnswers', taskId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase.from('task_form_data').select('*').eq('task_id', taskId)) as {
				data: TaskFormData[] | null
				error: PostgrestError | null
			}
			if (error) throw error
			return data ?? []
		},
		enabled: !!taskId
	})
}

export function useTaskTemplateById(templateId: UUID) {
	return useQuery({
		queryKey: ['taskTemplateById', templateId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = await supabase
				.from('task_templates')
				.select('*, question_templates(*)')
				.eq('id', templateId)
				.single()
			if (error) throw error
			return data as TaskTemplate
		},
		enabled: !!templateId
	})
}

export function useOrgSpecies(org_id: UUID) {
	return useQuery({
		queryKey: ['orgSpecies', org_id],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('org_species')
				.select('*, species(scientific_name, picture_url)')
				.eq('org_id', org_id)
				.eq('is_active', true)
				.order('custom_common_name', { ascending: true })) as {
				data: OrgSpecies[] | null
				error: PostgrestError | null
			}
			if (error) throw error
			return data
		}
	})
}

export function useAllSpeciesRequests() {
	return useQuery({
		queryKey: ['allSpeciesRequests'],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('species_requests')
				.select('*')
				.order('created_at', { ascending: false })) as { data: SpeciesRequest[] | null; error: PostgrestError | null }

			if (error) throw error
			return data
		}
	})
}

export function useCurrentUserProfile() {
	const { data: user } = useCurrentClientUser()
	return useQuery({
		queryKey: ['currentUserProfile', user?.id],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = await supabase
				.from('profiles')
				.select('id, first_name, last_name, email, full_name, theme_preference, is_superadmin, updated_at')
				.eq('id', user!.id)
				.single()
			if (error) throw error
			return data as AllProfile
		},
		enabled: !!user?.id
	})
}

export function useSchedulesForEnclosures(enclosureIds: UUID[]) {
	return useQuery({
		queryKey: ['schedulesForEnclosures', enclosureIds],
		queryFn: async () => {
			const supabase = createClient()
			const CHUNK_SIZE = 200
			const chunks: UUID[][] = []
			for (let i = 0; i < enclosureIds.length; i += CHUNK_SIZE) {
				chunks.push(enclosureIds.slice(i, i + CHUNK_SIZE))
			}
			const results = await Promise.all(
				chunks.map((chunk) =>
					supabase
						.from('enclosure_schedules')
						.select('*')
						.in('enclosure_id', chunk)
						.order('created_at', { ascending: false })
				)
			)
			for (const { error } of results) {
				if (error) throw error
			}
			return results.flatMap((r) => r.data ?? []) as EnclosureSchedule[]
		},
		enabled: enclosureIds.length > 0
	})
}

export function useDashboardActiveEnclosureCount(orgId: UUID | undefined) {
	return useQuery({
		queryKey: ['dashboard', 'activeEnclosureCount', orgId],
		queryFn: async () => {
			const supabase = createClient()
			const { count, error } = await supabase
				.from('enclosures')
				.select('id', { count: 'exact', head: true })
				.eq('org_id', orgId as UUID)
				.eq('is_active', true)
			if (error) throw error
			return count ?? 0
		},
		enabled: !!orgId
	})
}

export function useDashboardAtRiskEnclosures(orgId: UUID | undefined) {
	return useQuery({
		queryKey: ['dashboard', 'atRiskEnclosures', orgId],
		queryFn: async (): Promise<DashboardAtRiskData> => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('tasks')
				.select(
					'id, enclosure_id, due_date, priority, status, completed_time, enclosures!inner(id, name, org_id, is_active)'
				)
				.eq('enclosures.org_id', orgId as UUID)
				.eq('enclosures.is_active', true)
				.is('completed_time', null)
				.or('status.is.null,status.eq.pending,status.eq.late')) as {
				data: DashboardTaskRow[] | null
				error: PostgrestError | null
			}
			if (error) throw error

			const now = new Date()
			const byEnclosure = new Map<string, AtRiskEnclosureSummary>()
			const attentionTaskIds = new Set<string>()

			for (const task of data ?? []) {
				const enclosure = getDashboardTaskEnclosure(task)
				const enclosureId = task.enclosure_id ? String(task.enclosure_id) : enclosure ? String(enclosure.id) : null
				if (!enclosureId) {
					continue
				}

				const hasHighPriority = isHighPriority(task.priority)
				const hasValidDueDate = isValidDate(task.due_date)
				const isOverdue = hasValidDueDate ? new Date(task.due_date!).getTime() < now.getTime() : false

				if (!isOverdue && !hasHighPriority) {
					continue
				}

				attentionTaskIds.add(String(task.id))

				const existing = byEnclosure.get(enclosureId) ?? {
					enclosureId,
					enclosureName: enclosure?.name ?? enclosureId,
					overdueCount: 0,
					highPriorityCount: 0,
					nextDueAt: null
				}

				if (isOverdue) {
					existing.overdueCount += 1
				}
				if (hasHighPriority) {
					existing.highPriorityCount += 1
				}
				if (hasValidDueDate && compareNullableIsoDatesAsc(task.due_date, existing.nextDueAt) < 0) {
					existing.nextDueAt = task.due_date
				}

				byEnclosure.set(enclosureId, existing)
			}

			const items = Array.from(byEnclosure.values())
				.sort((a, b) => {
					if (b.overdueCount !== a.overdueCount) {
						return b.overdueCount - a.overdueCount
					}
					if (b.highPriorityCount !== a.highPriorityCount) {
						return b.highPriorityCount - a.highPriorityCount
					}
					return compareNullableIsoDatesAsc(a.nextDueAt, b.nextDueAt)
				})
				.slice(0, DASHBOARD_MAX_AT_RISK_ITEMS)

			return {
				items,
				attentionNeededCount: attentionTaskIds.size
			}
		},
		enabled: !!orgId
	})
}

export function useDashboardTasksDueToday(orgId: UUID | undefined) {
	return useQuery({
		queryKey: ['dashboard', 'tasksDueToday', orgId],
		queryFn: async (): Promise<UpcomingScheduleItem[]> => {
			const supabase = createClient()
			const { start, end } = getServerDayBounds()
			const { data, error } = (await supabase
				.from('tasks')
				.select(
					'id, enclosure_id, name, description, due_date, priority, status, completed_time, enclosures!inner(id, name, org_id, is_active)'
				)
				.eq('enclosures.org_id', orgId as UUID)
				.eq('enclosures.is_active', true)
				.is('completed_time', null)
				.or('status.is.null,status.eq.pending,status.eq.late')
				.gte('due_date', start.toISOString())
				.lt('due_date', end.toISOString())
				.order('due_date', { ascending: true })) as { data: DashboardTaskRow[] | null; error: PostgrestError | null }
			if (error) throw error

			return (data ?? [])
				.sort((a, b) => {
					const aPrioritySort = isHighPriority(a.priority) ? 0 : 1
					const bPrioritySort = isHighPriority(b.priority) ? 0 : 1
					if (aPrioritySort !== bPrioritySort) {
						return aPrioritySort - bPrioritySort
					}
					return compareNullableIsoDatesAsc(a.due_date, b.due_date)
				})
				.map((task) => {
					const enclosure = getDashboardTaskEnclosure(task)
					const enclosureId = task.enclosure_id ? String(task.enclosure_id) : enclosure ? String(enclosure.id) : ''
					return {
						taskId: String(task.id),
						enclosureId,
						enclosureName: enclosure?.name ?? enclosureId,
						taskTitle: getTaskTitle(task),
						dueAt: task.due_date,
						priority: typeof task.priority === 'string' ? task.priority : null
					}
				})
		},
		enabled: !!orgId
	})
}

export function useDashboardUpcomingTaskCount(orgId: UUID | undefined) {
	return useQuery({
		queryKey: ['dashboard', 'upcomingTaskCount', orgId],
		queryFn: async () => {
			const supabase = createClient()
			const { end: tomorrowStart } = getServerDayBounds()
			const sevenDaysOut = new Date(tomorrowStart)
			sevenDaysOut.setUTCDate(sevenDaysOut.getUTCDate() + 7)

			const { count, error } = await supabase
				.from('tasks')
				.select('id, enclosures!inner(org_id, is_active)', { count: 'exact', head: true })
				.eq('enclosures.org_id', orgId as UUID)
				.eq('enclosures.is_active', true)
				.is('completed_time', null)
				.or('status.is.null,status.eq.pending,status.eq.late')
				.gte('due_date', tomorrowStart.toISOString())
				.lt('due_date', sevenDaysOut.toISOString())
			if (error) throw error
			return count ?? 0
		},
		enabled: !!orgId
	})
}

export function useDashboardRecentActivity(orgId: UUID | undefined) {
	return useQuery({
		queryKey: ['dashboard', 'recentActivity', orgId],
		queryFn: async (): Promise<RecentActivityItem[]> => {
			const supabase = createClient()
			const { start, end } = getServerDayBounds()
			const { data, error } = (await supabase
				.from('tasks')
				.select(
					'id, enclosure_id, name, description, due_date, priority, status, completed_time, enclosures!inner(id, name, org_id, is_active)'
				)
				.eq('enclosures.org_id', orgId as UUID)
				.eq('enclosures.is_active', true)
				.eq('status', 'completed')
				.gte('completed_time', start.toISOString())
				.lt('completed_time', end.toISOString())
				.order('completed_time', { ascending: false })
				.limit(DASHBOARD_MAX_RECENT_ACTIVITY_ITEMS)) as {
				data: DashboardTaskRow[] | null
				error: PostgrestError | null
			}
			if (error) throw error

			const orgIdString = orgId ? String(orgId) : ''
			const items: RecentActivityItem[] = []
			for (const task of data ?? []) {
				if (!isValidDate(task.completed_time)) {
					continue
				}

				const enclosure = getDashboardTaskEnclosure(task)
				const enclosureId = task.enclosure_id ? String(task.enclosure_id) : enclosure ? String(enclosure.id) : null
				const enclosureName = enclosure?.name ?? 'Enclosure'
				const href = enclosureId
					? `/protected/orgs/${orgIdString}/enclosures/${enclosureId}`
					: `/protected/orgs/${orgIdString}`
				const completionStateLabels = getCompletionStateLabels(task)
				const completionStateSuffix = completionStateLabels.length > 0 ? ` (${completionStateLabels.join(', ')})` : ''

				items.push({
					id: `task-completed-${task.id}`,
					type: 'task_completed',
					label: `${getTaskTitle(task)} completed in ${enclosureName}${completionStateSuffix}`,
					occurredAt: task.completed_time!,
					href
				})
			}

			return items.sort((a, b) => compareIsoDatesDesc(a.occurredAt, b.occurredAt))
		},
		enabled: !!orgId
	})
}

export function useIsSpeciesInUse(speciesId: UUID | undefined) {
	return useQuery({
		queryKey: ['isSpeciesInUse', speciesId],
		queryFn: async () => {
			const supabase = createClient()
			const { count, error } = await supabase
				.from('org_species')
				.select('id', { count: 'exact', head: true })
				.eq('master_species_id', speciesId!)
			if (error) throw error
			return (count ?? 0) > 0
		},
		enabled: !!speciesId
	})
}

export type EnclosureCountHistory = {
	id: string
	enclosure_id: string
	old_count: number
	new_count: number
	changed_by: string | null
	changed_at: string
	profiles: Pick<MemberProfile, 'full_name' | 'first_name' | 'last_name'> | null
}

export function useEnclosureCountHistory(enclosureId: UUID) {
	return useQuery({
		queryKey: ['enclosureCountHistory', enclosureId],
		queryFn: async () => {
			const supabase = createClient()
			const { data: history, error } = await supabase
				.from('enclosure_count_history')
				.select('id, enclosure_id, old_count, new_count, changed_by, changed_at')
				.eq('enclosure_id', enclosureId)
				.order('changed_at', { ascending: false })
				.limit(50)
			if (error) throw error

			const changerIds = [...new Set((history ?? []).map((h) => h.changed_by).filter(Boolean))] as string[]
			let profileMap = new Map<string, Pick<MemberProfile, 'full_name' | 'first_name' | 'last_name'>>()
			if (changerIds.length > 0) {
				const { data: profiles } = await supabase
					.from('profiles')
					.select('id, full_name, first_name, last_name')
					.in('id', changerIds)
				profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))
			}

			return (history ?? []).map((h) => ({
				...h,
				profiles: h.changed_by ? (profileMap.get(h.changed_by) ?? null) : null
			})) as EnclosureCountHistory[]
		},
		enabled: !!enclosureId
	})
}

export function usePushSubscriptionsForUser(userId: string | undefined) {
	return useQuery({
		queryKey: ['pushSubscriptions', userId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('push_subscriptions')
				.select('*')
				.eq('user_id', userId)
				.eq('is_active', true)) as { data: PushSubscription[] | null; error: PostgrestError | null }
			if (error) throw error
			return data
		},
		enabled: !!userId
	})
}
