'use client'

import React from 'react'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogTrigger
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import getAccessLevelName from '@/context/access-levels'

interface OrgRolesDialogProps {
	orgRoles: Array<{
		orgs?: { name?: string }
		access_lvl: number
		org_id: string | number
	}>
	trigger: React.ReactNode
}

export function OrgRolesDialog({ orgRoles, trigger }: OrgRolesDialogProps) {
	return (
		<Dialog>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className='max-w-xs p-4'>
				<DialogHeader>
					<DialogTitle>Organizations & Roles</DialogTitle>
					<DialogDescription>Member&apos;s roles in each organization</DialogDescription>
				</DialogHeader>
				<div className='flex flex-col gap-2 mt-2'>
					{orgRoles.map((role) => (
						<div key={role.org_id} className='flex items-center gap-2'>
							<Badge variant='outline'>{role.orgs?.name ?? 'Unknown'}</Badge>
							<span className='text-xs text-muted-foreground'>{getAccessLevelName(role.access_lvl)}</span>
						</div>
					))}
				</div>
			</DialogContent>
		</Dialog>
	)
}
