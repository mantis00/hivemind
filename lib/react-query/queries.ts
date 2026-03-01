import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { PostgrestError } from '@supabase/supabase-js'
import { UUID } from 'crypto'
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
	form_data: Record<string, unknown> | null
	schedule_id: UUID | null
	time_window: string | null
	start_time: string | null
	time_to_completion: string | null
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

export function useSpecies(orgId: UUID) {
	return useQuery({
		queryKey: ['species'],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('org_species')
				.select('*, species(scientific_name, picture_url)')) as {
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
	return useQuery({
		queryKey: ['tasksForEnclosures', enclosureIds],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase.from('tasks').select('*').in('enclosure_id', enclosureIds)) as {
				data: Task[] | null
				error: PostgrestError | null
			}
			if (error) throw error
			return data
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
