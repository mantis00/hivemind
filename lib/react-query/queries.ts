import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { PostgrestError } from '@supabase/supabase-js'
import { UUID } from 'crypto'

export type Org = {
	org_id: number
	name: string
	created_at: string
}

export type UserOrg = {
	org_id: number
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
}

export type Invite = {
	invite_id: string
	org_id: number
	inviter_id: string
	invitee_email: string
	access_lvl: number
	status: 'pending' | 'accepted' | 'rejected'
	created_at: string
	expires_at: string
	orgs?: {
		name: string
		org_id: number
	}
}
export type Enclosure = {
	id: number
	ord_id: number
	species_id: string
	name: string
	created_at: string
	location: string
	current_count: number
	locations?: { name: string }
	species?: { id: number; scientific_name: string; common_name: string; care_instructions: string }
}

export type Species = {
	id: number
	org_id: number
	species_id: string
	name: string
	created_at: string
	location: string
}
export type Tasks = {
	id: number
	created_at: string
	tank_id: number
	description: string
	status: string
	due_date: string
	priority: string
	completed_by: string
	completed_time: string
	name: string
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

export function useOrgMembers(orgId: number) {
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

export function useMemberProfiles(userIds: string[]) {
	return useQuery({
		queryKey: ['profiles', userIds],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('profiles')
				.select('id, first_name, last_name, email, full_name')
				.in('id', userIds)) as { data: MemberProfile[] | null; error: PostgrestError | null }

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

export function useSentInvites(orgId: number) {
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

export function useVerifyOrgMembership(userId: string, orgId: number) {
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

export function useOrgDetails(orgId: number) {
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

export function useEnclosureIdPriority(enclosureId: number) {
	return useQuery({
		queryKey: ['priority-level', enclosureId],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = (await supabase
				.from('tasks')
				.select('id, enclosures(*)')
				.eq('enclosure_id', enclosureId)) as { data: Tasks[] | null; error: PostgrestError | null }

			if (error) throw error
			return data
		},
		enabled: !!enclosureId
	})
}
