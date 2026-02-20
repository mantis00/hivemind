import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

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
		mutationFn: async ({ orgId, userId }: { orgId: number; userId: string }) => {
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
		mutationFn: async ({ orgId, userId }: { orgId: number; userId: string }) => {
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
			orgId: number
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
		}
	})
}

export function useAcceptInvite() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ inviteId, userId }: { inviteId: string; userId: string }) => {
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
		mutationFn: async ({ inviteId }: { inviteId: string }) => {
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
		mutationFn: async ({ inviteId }: { inviteId: string }) => {
			const supabase = createClient()

			// Delete the invite
			const { error } = await supabase.from('invites').delete().eq('invite_id', inviteId).eq('status', 'pending')

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
		mutationFn: async ({ orgId, userId }: { orgId: number; userId: string }) => {
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
			orgId: number
			species_id: number
			name: string
			location: number
			current_count: number
		}) => {
			const supabase = createClient()
			if (name.trim() === '') {
				throw new Error('Recieved an empty field')
			}
			// Insert the organization
			const { error: enclosureError } = await supabase
				.from('tanks')
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
		}
	})
}

export function useDeleteEnclosure() {
	const queryClient = useQueryClient()

	return useMutation({
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		mutationFn: async ({ id, orgId }: { id: number; orgId: number }) => {
			const supabase = createClient()

			// Delete user_org_role relationships
			const { error: enclosureRelationError } = await supabase.from('tasks').delete().eq('tank_id', id)
			if (enclosureRelationError) throw enclosureRelationError

			const { error: enclosureNoteRelationError } = await supabase.from('tank_notes').delete().eq('tank_id', id)
			if (enclosureNoteRelationError) throw enclosureNoteRelationError

			// Delete the organization
			const { error: enclosureError } = await supabase.from('tanks').delete().eq('id', id)
			if (enclosureError) throw enclosureError
		},
		onSuccess: (data, variables) => {
			// Invalidate and refetch user orgs
			queryClient.invalidateQueries({ queryKey: ['orgEnclosures', variables.orgId] })
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
			enclosureId: number
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
