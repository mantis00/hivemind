import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import getAccessLevelName from '@/context/access-levels'
import { Building2 } from 'lucide-react'

interface OrgRolesBadgeProps {
	orgRoles: Array<{
		org_id: string
		orgs?: { name?: string }
		access_lvl: number
	}>
	isMobile?: boolean
}

export function OrgRolesBadge({ orgRoles }: OrgRolesBadgeProps) {
	const [open, setOpen] = React.useState(false)

	if (!orgRoles || orgRoles.length === 0) {
		return <span className='text-muted-foreground text-sm'>No orgs</span>
	}

	if (orgRoles.length === 1) {
		const role = orgRoles[0]
		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<Badge variant='outline' className='cursor-default'>
							{role.orgs?.name ?? 'Unknown'}
						</Badge>
					</TooltipTrigger>
					<TooltipContent>
						<p>{getAccessLevelName(role.access_lvl)}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		)
	}

	// Multiple orgs: show button that opens dialog/drawer
	return (
		<>
			<Button variant='outline' size='sm' onClick={() => setOpen(true)} className='gap-1.5'>
				<Building2 className='h-3 w-3' />
				{orgRoles.length} Orgs
			</Button>
			<ResponsiveDialogDrawer
				title='Organizations & Roles'
				description='Membership and access levels'
				trigger={null}
				open={open}
				onOpenChange={setOpen}
			>
				<div className='flex flex-col gap-2 pt-1'>
					{orgRoles.map((role) => (
						<div
							key={role.org_id}
							className='flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5 bg-muted/40'
						>
							<div className='flex items-center gap-2'>
								<Building2 className='h-4 w-4 text-muted-foreground shrink-0' />
								<span className='text-sm font-medium'>{role.orgs?.name ?? 'Unknown'}</span>
							</div>
							<Badge variant='secondary' className='shrink-0 text-xs'>
								{getAccessLevelName(role.access_lvl)}
							</Badge>
						</div>
					))}
				</div>
			</ResponsiveDialogDrawer>
		</>
	)
}
