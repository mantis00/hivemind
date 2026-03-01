import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { UUID } from 'crypto'
import { toast } from 'sonner'
import { Species } from './queries'
import { PostgrestError } from '@supabase/supabase-js'

export function useCreateOrg() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ name, userId }: { name: string; userId: string }) => {
			const supabase = createClient()

			if (name.trim() === '') {
				throw new Error('Organization name cannot be empty')
			}

			// Insert the organization
			const { data: org, error: orgError } = await supabase.from('orgs').insert({ name: name.trim() }).select().single()

			if (orgError) throw orgError

			// Update the user_org_role table with proper access level
			const { error: relationError } = await supabase.from('user_org_role').insert({
				user_id: userId,
				org_id: org.org_id,
				access_lvl: 3
			})

			if (relationError) {
				// If we fail to update the user_org_role table, delete the org
				await supabase.from('orgs').delete().eq('org_id', org.org_id)
				throw relationError
			}
		},
		onSuccess: (data, variables) => {
			// Invalidate and refetch user orgs
			queryClient.invalidateQueries({ queryKey: ['orgs', variables.userId] })
		}
	})
}

export function useDeleteOrg() {
	const queryClient = useQueryClient()

	return useMutation({
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		mutationFn: async ({ orgId, userId }: { orgId: UUID; userId: string }) => {
			const supabase = createClient()

			// Delete user_org_role relationships
			const { error: relationError } = await supabase.from('user_org_role').delete().eq('org_id', orgId)
			if (relationError) throw relationError

			// Delete the organization
			const { error: orgError } = await supabase.from('orgs').delete().eq('org_id', orgId)
			if (orgError) throw orgError
		},
		onSuccess: (data, variables) => {
			// Invalidate and refetch user orgs
			queryClient.invalidateQueries({ queryKey: ['orgs', variables.userId] })
		}
	})
}

export function useLeaveOrg() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ orgId, userId }: { orgId: UUID; userId: string }) => {
			const supabase = createClient()

			const { error } = await supabase.from('user_org_role').delete().eq('org_id', orgId).eq('user_id', userId)
			if (error) throw error
		},
		onSuccess: (data, variables) => {
			// Invalidate org members and user orgs
			queryClient.invalidateQueries({ queryKey: ['orgMembers', variables.orgId] })
			queryClient.invalidateQueries({ queryKey: ['orgs', variables.userId] })
		}
	})
}

export function useUpdateProfile() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ userId, firstName, lastName }: { userId: string; firstName: string; lastName: string }) => {
			const supabase = createClient()

			if (firstName.trim() === '' || lastName.trim() === '') {
				throw new Error('First name or last name cannot be empty')
			}

			const { error } = await supabase
				.from('profiles')
				.update({ first_name: firstName.trim(), last_name: lastName.trim() })
				.eq('id', userId)

			if (error) throw error
		},
		onSuccess: (data, variables) => {
			// Invalidate profile queries
			queryClient.invalidateQueries({ queryKey: ['profiles', variables.userId] })
		}
	})
}

export function useInviteMember() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			orgId,
			inviterId,
			inviteeEmail,
			accessLvl
		}: {
			orgId: UUID
			inviterId: string
			inviteeEmail: string
			accessLvl: number
		}) => {
			const supabase = createClient()

			// get inviter email
			const {
				data: { user },
				error: userError
			} = await supabase.auth.getUser()

			if (userError) throw userError
			const inviterEmail = user?.email
			if (!inviterEmail) {
				throw new Error('Inviter email not found')
			}

			// make sure inviter is not inviting themselves
			if (inviterEmail === inviteeEmail.trim().toLowerCase()) {
				throw new Error('You cannot invite yourself!')
			}

			// Check if email already has a user account and is a member
			const { data: existingUser } = await supabase
				.from('profiles')
				.select('id')
				.eq('email', inviteeEmail.trim().toLowerCase())
				.maybeSingle()

			if (existingUser) {
				// User exists, check if they're already a member
				const { data: existingMember, error: memberError } = await supabase
					.from('user_org_role')
					.select('user_id')
					.eq('org_id', orgId)
					.eq('user_id', existingUser.id)
					.maybeSingle()

				if (memberError) throw memberError

				if (existingMember) {
					throw new Error('User is already a member of the organization')
				}
			}

			// make sure there is not already a pending invite for this email and org
			const { data: existingInvite, error: inviteError } = await supabase
				.from('invites')
				.select('invite_id')
				.eq('org_id', orgId)
				.eq('invitee_email', inviteeEmail.trim().toLowerCase())
				.eq('status', 'pending')
				.maybeSingle()

			if (inviteError) throw inviteError

			if (existingInvite) {
				throw new Error('There is already a pending invite for this email and organization')
			}

			// Create the invite
			const { error } = await supabase.from('invites').insert({
				org_id: orgId,
				inviter_id: inviterId,
				invitee_email: inviteeEmail.trim().toLowerCase(),
				access_lvl: accessLvl,
				status: 'pending'
			})

			if (error) throw error
		},
		onSuccess: () => {
			// Invalidate invites
			queryClient.invalidateQueries({ queryKey: ['invites'] })
			toast.success('Invite sent successfully!')
		}
	})
}

export function useAcceptInvite() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ inviteId, userId }: { inviteId: UUID; userId: string }) => {
			const supabase = createClient()

			// Get the invite details
			const { data: invite, error: inviteError } = await supabase
				.from('invites')
				.select('*')
				.eq('invite_id', inviteId)
				.eq('status', 'pending')
				.single()

			if (inviteError) throw inviteError
			if (!invite) throw new Error('Invite not found or already processed')

			// Check if invite is expired
			if (new Date(invite.expires_at) < new Date()) {
				throw new Error('Invite has expired')
			}

			// Add user to org
			const { error: roleError } = await supabase.from('user_org_role').insert({
				user_id: userId,
				org_id: invite.org_id,
				access_lvl: invite.access_lvl
			})

			if (roleError) throw roleError

			// Update invite status to accepted
			const { error: updateError } = await supabase
				.from('invites')
				.update({ status: 'accepted' })
				.eq('invite_id', inviteId)

			if (updateError) throw updateError
		},
		onSuccess: (data, variables) => {
			// Invalidate invites
			queryClient.invalidateQueries({ queryKey: ['invites'] })
			queryClient.invalidateQueries({ queryKey: ['orgs', variables.userId] })
			queryClient.invalidateQueries({ queryKey: ['orgMembers'] })
			queryClient.invalidateQueries({ queryKey: ['profiles'] })
		}
	})
}

export function useRejectInvite() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ inviteId }: { inviteId: UUID }) => {
			const supabase = createClient()

			// Update invite status to rejected
			const { error } = await supabase.from('invites').update({ status: 'rejected' }).eq('invite_id', inviteId)

			if (error) throw error
		},
		onSuccess: () => {
			// Invalidate invites
			queryClient.invalidateQueries({ queryKey: ['invites'] })
		}
	})
}

export function useRetractInvite() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ inviteId }: { inviteId: UUID }) => {
			const supabase = createClient()

			// Mark the invite as cancelled
			const { error } = await supabase
				.from('invites')
				.update({ status: 'cancelled' })
				.eq('invite_id', inviteId)
				.eq('status', 'pending')

			if (error) throw error
		},
		onSuccess: () => {
			// Invalidate org invites
			queryClient.invalidateQueries({ queryKey: ['invites'] })
		}
	})
}

// this is the same as useLeaveOrg, but incase we want to add additional stuff afterwards in the future, they are seperate ones.
export function useKickMember() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ orgId, userId }: { orgId: UUID; userId: string }) => {
			const supabase = createClient()

			// Delete the user_org_role relationship
			const { error } = await supabase.from('user_org_role').delete().eq('org_id', orgId).eq('user_id', userId)
			if (error) throw error
		},
		onSuccess: (data, variables) => {
			// Invalidate org members and user orgs
			queryClient.invalidateQueries({ queryKey: ['orgMembers', variables.orgId] })
			queryClient.invalidateQueries({ queryKey: ['orgs', variables.userId] })
		}
	})
}

export function useCreateEnclosure() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({
			orgId,
			species_id,
			name,
			location,
			current_count
		}: {
			orgId: UUID
			species_id: UUID
			name: string
			location: UUID
			current_count: number
		}) => {
			const supabase = createClient()
			if (name.trim() === '') {
				throw new Error('Recieved an empty field')
			}
			// Insert the organization
			const { error: enclosureError } = await supabase
				.from('enclosures')
				.insert({
					org_id: orgId,
					species_id: species_id,
					name: name.trim(),
					location: location,
					current_count: current_count
				})
				.select()
				.single()

			if (enclosureError) throw enclosureError
		},
		onSuccess: (data, variables) => {
			// Invalidate and refetch enclosures orgs
			queryClient.invalidateQueries({ queryKey: ['orgEnclosures', variables.orgId] })
			queryClient.invalidateQueries({ queryKey: ['speciesEnclosures', variables.orgId] })
		}
	})
}

export function useDeleteEnclosure() {
	const queryClient = useQueryClient()

	return useMutation({
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		mutationFn: async ({ id, orgId }: { id: UUID; orgId: UUID }) => {
			const supabase = createClient()

			// Delete user_org_role relationships
			const { error: enclosureRelationError } = await supabase.from('tasks').delete().eq('enclosure_id', id)
			if (enclosureRelationError) throw enclosureRelationError

			const { error: enclosureNoteRelationError } = await supabase.from('tank_notes').delete().eq('enclosure_id', id)
			if (enclosureNoteRelationError) throw enclosureNoteRelationError

			// Delete the organization
			const { error: enclosureError } = await supabase.from('enclosures').delete().eq('id', id)
			if (enclosureError) throw enclosureError
		},
		onSuccess: (data, variables) => {
			// Invalidate and refetch user orgs
			queryClient.invalidateQueries({ queryKey: ['orgEnclosures', variables.orgId] })
			queryClient.invalidateQueries({ queryKey: ['speciesEnclosures', variables.orgId] })
		}
	})
}

export function useBatchDeleteEnclosures() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ ids, orgId }: { ids: UUID[]; orgId: UUID }) => {
			const supabase = createClient()

			// Delete tasks for all enclosures
			const { error: tasksError } = await supabase.from('tasks').delete().in('enclosure_id', ids)
			if (tasksError) throw tasksError

			// Delete tank notes for all enclosures
			const { error: notesError } = await supabase.from('tank_notes').delete().in('enclosure_id', ids)
			if (notesError) throw notesError

			// Delete all enclosures
			const { error: enclosuresError } = await supabase.from('enclosures').delete().in('id', ids)
			if (enclosuresError) throw enclosuresError
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['orgEnclosures', variables.orgId] })
			queryClient.invalidateQueries({ queryKey: ['speciesEnclosures', variables.orgId] })
		}
	})
}

export function useCreateEnclosureNote() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async ({
			enclosureId,
			userId,
			noteText
		}: {
			enclosureId: UUID
			userId: string // from auth
			noteText: string
		}) => {
			const supabase = createClient()
			if (noteText.trim() === '') {
				throw new Error('Recieved an empty field')
			}
			// Insert the organization
			const { error: enclosureNoteError } = await supabase
				.from('tank_notes')
				.insert({
					enclosure_id: enclosureId,
					user_id: userId,
					note_text: noteText.trim()
				})
				.select()
				.single()

			if (enclosureNoteError) throw enclosureNoteError
		},
		onSuccess: (data, variables) => {
			// Invalidate and refetch enclosures orgs
			queryClient.invalidateQueries({ queryKey: ['enclosureNotes', variables.enclosureId] })
		}
	})
}

export function useUpdateEnclosure() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			orgId,
			enclosure_id,
			name,
			species_id,
			location_id,
			count
		}: {
			orgId: UUID
			enclosure_id: UUID
			name: string
			species_id: UUID
			location_id: UUID
			count: number
		}) => {
			const supabase = createClient()

			if (name.trim() === '') {
				throw new Error('First name or last name cannot be empty')
			}

			const { error } = await supabase
				.from('enclosures')
				.update({ name: name.trim(), species_id: species_id, location: location_id, current_count: count })
				.eq('id', enclosure_id)

			if (error) throw error
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['orgEnclosures', variables.orgId] })
			queryClient.invalidateQueries({ queryKey: ['speciesEnclosures', variables.orgId] })
		}
	})
}

export function useSuperadminElavate() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ userId }: { userId: string }) => {
			const supabase = createClient()

			// Update the user's superadmin status
			const { error } = await supabase.from('profiles').update({ is_superadmin: true }).eq('id', userId)

			if (error) throw error
		},
		onSuccess: (data, variables) => {
			// Invalidate and refetch superadmin data
			queryClient.invalidateQueries({ queryKey: ['allProfiles'] })
		}
	})
}

export function useRequestOrg() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ requesterId, orgName }: { requesterId: string; orgName: string }) => {
			const supabase = createClient()

			if (orgName.trim() === '') {
				throw new Error('Organization name cannot be empty')
			}

			// Prevent duplicate pending requests for the same name by the same user
			const { data: existing, error: checkError } = await supabase
				.from('org_requests')
				.select('request_id')
				.eq('requester_id', requesterId)
				.eq('org_name', orgName.trim())
				.eq('status', 'pending')
				.maybeSingle()

			if (checkError) throw checkError
			if (existing) throw new Error('There is already a pending request for this organization')

			const { error } = await supabase.from('org_requests').insert({
				requester_id: requesterId,
				org_name: orgName.trim()
			})

			if (error) throw error
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['orgRequests', variables.requesterId] })
			toast.success('Request submitted! A superadmin will review it shortly.')
		}
	})
}

export function useApproveOrgRequest() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ requestId, reviewerId }: { requestId: UUID; reviewerId: string }) => {
			const supabase = createClient()
			const { error } = await supabase.rpc('approve_org_request', {
				p_request_id: requestId,
				p_reviewer_id: reviewerId
			})
			if (error) throw error
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['allOrgRequests'] })
			queryClient.invalidateQueries({ queryKey: ['orgRequests'] })
			queryClient.invalidateQueries({ queryKey: ['orgs'] })
			queryClient.invalidateQueries({ queryKey: ['orgMembers'] })
			queryClient.invalidateQueries({ queryKey: ['allProfiles'] })
		}
	})
}

export function useRejectOrgRequest() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ requestId, reviewerId }: { requestId: UUID; reviewerId: string }) => {
			const supabase = createClient()

			const { error } = await supabase
				.from('org_requests')
				.update({ status: 'rejected', reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
				.eq('request_id', requestId)
				.eq('status', 'pending')

			if (error) throw error
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['allOrgRequests'] })
			queryClient.invalidateQueries({ queryKey: ['orgRequests'] })
		}
	})
}

export function useRetractOrgRequest() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ requestId }: { requestId: UUID }) => {
			const supabase = createClient()

			const { error } = await supabase
				.from('org_requests')
				.update({ status: 'cancelled' })
				.eq('request_id', requestId)
				.eq('status', 'pending')

			if (error) throw error
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['orgRequests'] })
			queryClient.invalidateQueries({ queryKey: ['allOrgRequests'] })
		}
	})
}

export function useUpdateSpeciesImage() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ species_id, picture_url }: { species_id: UUID; picture_url: string }) => {
			const supabase = createClient()

			if (!species_id || picture_url === '') {
				throw new Error('Missing id or url is empty')
			}

			const { error } = await supabase.from('species').update({ picture_url: picture_url }).eq('id', species_id)

			if (error) throw error
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ['singleSpecies', variables.species_id] })
			queryClient.invalidateQueries({ queryKey: ['allSpecies'] })
			queryClient.invalidateQueries({ queryKey: ['species'] })
		}
	})
}

export function useCreateSpecies() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			scientific_name,
			common_name,
			care_instructions,
			picture_url
		}: {
			scientific_name: string
			common_name: string
			care_instructions: string
			picture_url?: string
		}) => {
			const supabase = createClient()

			if (!scientific_name.trim() || !common_name.trim()) {
				throw new Error('Scientific name and common name are required')
			}

			const { error } = await supabase.from('species').insert({
				scientific_name: scientific_name.trim(),
				common_name: common_name.trim(),
				care_instructions: care_instructions.trim(),
				...(picture_url ? { picture_url } : {})
			})

			if (error) throw error
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['allSpecies'] })
			queryClient.invalidateQueries({ queryKey: ['species'] })
			toast.success('Species created successfully!')
		}
	})
}

export function useDeleteSpecies() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ species_id }: { species_id: UUID }) => {
			const supabase = createClient()
			const { error } = await supabase.from('species').delete().eq('id', species_id)
			if (error) throw error
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['allSpecies'] })
			queryClient.invalidateQueries({ queryKey: ['species'] })
			toast.success('Species deleted successfully!')
		}
	})
}

export function useUpdateSpecies() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			species_id,
			scientific_name,
			common_name,
			care_instructions
		}: {
			species_id: UUID
			scientific_name: string
			common_name: string
			care_instructions: string
		}) => {
			const supabase = createClient()

			if (!scientific_name.trim() || !common_name.trim()) {
				throw new Error('Scientific name and common name are required')
			}

			const { error } = await supabase
				.from('species')
				.update({
					scientific_name: scientific_name.trim(),
					common_name: common_name.trim(),
					care_instructions: care_instructions.trim()
				})
				.eq('id', species_id)

			if (error) throw error
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['allSpecies'] })
			queryClient.invalidateQueries({ queryKey: ['species'] })
			toast.success('Species updated successfully!')
		}
	})
}

export function useRequestSpecies() {
	return useMutation({
		mutationFn: async ({
			scientific_name,
			common_name,
			care_instructions,
			org_id,
			user_id
		}: {
			scientific_name: string
			common_name: string
			care_instructions: string
			org_id: UUID
			user_id: UUID
		}) => {
			const supabase = createClient()

			if (!scientific_name.trim() || !common_name.trim()) {
				throw new Error('Scientific name and common name are required')
			}

			const { error } = await supabase
				.from('species_requests')
				.insert({
					scientific_name: scientific_name.trim(),
					common_name: common_name.trim(),
					care_instructions: care_instructions.trim(),
					org_id: org_id,
					user_id: user_id
				})
				.select()
				.single()

			if (error) throw error
		},
		onSuccess: () => {
			toast.success('Species request sent!')
		}
	})
}

export function useUpdateOrgSpecies() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			org_id,
			species_id,
			custom_common_name,
			custom_care_instructions
		}: {
			org_id: UUID
			species_id: UUID
			custom_common_name: string
			custom_care_instructions: string
		}) => {
			const supabase = createClient()

			if (!custom_common_name.trim()) {
				throw new Error('Common name is required')
			}

			const { error } = await supabase
				.from('org_species')
				.update({
					custom_common_name: custom_common_name.trim(),
					custom_care_instructions: custom_care_instructions.trim()
				})
				.eq('id', species_id)
				.eq('org_id', org_id)

			if (error) throw error
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['orgSpecies'] })
			queryClient.invalidateQueries({ queryKey: ['species'] })
			toast.success('Species updated!')
		}
	})
}

export function useAddBatchSpeciesToOrg() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			species_ids, // master list species ids
			org_id // org to add species to
		}: {
			species_ids: UUID[]
			org_id: UUID
		}) => {
			const supabase = createClient()

			// Fetch all master species records for the given ids
			const { data, error: fetchError } = (await supabase.from('species').select('*').in('id', species_ids)) as {
				data: Species[] | null
				error: PostgrestError | null
			}
			if (fetchError) throw fetchError
			if (!data || data.length === 0) throw new Error('No species found')

			// Insert one org_species row per species
			const rows = data.map((s) => ({
				org_id,
				master_species_id: s.id,
				custom_common_name: s.common_name,
				custom_care_instructions: s.care_instructions
			}))

			const { error } = await supabase.from('org_species').insert(rows)
			if (error) throw error
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['orgSpecies'] })
			queryClient.invalidateQueries({ queryKey: ['species'] })
			toast.success('Species added to organization!')
		}
	})
}

export function useDeleteSpeciesFromOrg() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ species_id, orgId }: { species_id: UUID; orgId: UUID }) => {
			const supabase = createClient()

			// Get all enclosures for this species in the org
			const { data: enclosures, error: enclosuresError } = await supabase
				.from('enclosures')
				.select('id')
				.eq('species_id', species_id)
				.eq('org_id', orgId)

			if (enclosuresError) throw enclosuresError

			const enclosure_ids = enclosures?.map((e) => e.id) || []

			// Delete tasks for all enclosures
			if (enclosure_ids.length > 0) {
				const { error: tasksError } = await supabase.from('tasks').delete().in('enclosure_id', enclosure_ids)
				if (tasksError) throw tasksError

				// Delete tank notes for all enclosures
				const { error: notesError } = await supabase.from('tank_notes').delete().in('enclosure_id', enclosure_ids)
				if (notesError) throw notesError

				// Delete all enclosures
				const { error: deleteError } = await supabase.from('enclosures').delete().in('id', enclosure_ids)
				if (deleteError) throw deleteError
			}

			// Delete the species from org
			const { error: speciesError } = await supabase
				.from('org_species')
				.delete()
				.eq('id', species_id)
				.eq('org_id', orgId)
			if (speciesError) throw speciesError
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['orgEnclosures', variables.orgId] })
			queryClient.invalidateQueries({ queryKey: ['speciesEnclosures', variables.orgId] })
			queryClient.invalidateQueries({ queryKey: ['orgSpecies', variables.orgId] })
			toast.success('Species removed from organization')
		}
	})
}

export function useDeleteBatchSpeciesFromOrg() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ species_ids, orgId }: { species_ids: UUID[]; orgId: UUID }) => {
			const supabase = createClient()

			// Get all enclosures for these species in the org
			const { data: enclosures, error: enclosuresError } = await supabase
				.from('enclosures')
				.select('id')
				.in('species_id', species_ids)
				.eq('org_id', orgId)

			if (enclosuresError) throw enclosuresError

			const enclosure_ids = enclosures?.map((e) => e.id) || []

			if (enclosure_ids.length > 0) {
				// Delete tasks for all enclosures
				const { error: tasksError } = await supabase.from('tasks').delete().in('enclosure_id', enclosure_ids)
				if (tasksError) throw tasksError

				// Delete tank notes for all enclosures
				const { error: notesError } = await supabase.from('tank_notes').delete().in('enclosure_id', enclosure_ids)
				if (notesError) throw notesError

				// Delete all enclosures
				const { error: deleteEnclosuresError } = await supabase.from('enclosures').delete().in('id', enclosure_ids)
				if (deleteEnclosuresError) throw deleteEnclosuresError
			}

			// Delete all org_species records
			const { error: speciesError } = await supabase
				.from('org_species')
				.delete()
				.in('id', species_ids)
				.eq('org_id', orgId)
			if (speciesError) throw speciesError
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['orgEnclosures', variables.orgId] })
			queryClient.invalidateQueries({ queryKey: ['speciesEnclosures', variables.orgId] })
			queryClient.invalidateQueries({ queryKey: ['orgSpecies', variables.orgId] })
			toast.success('All species removed from organization')
		}
	})
}
