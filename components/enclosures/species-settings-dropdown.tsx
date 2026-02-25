'use client'
import { hasEnvVars } from '@/lib/utils'
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuGroup,
	DropdownMenuItem
} from '@/components/ui/dropdown-menu'
import { CircleUserRound, MoreVertical, Link, Settings, LogOut } from 'lucide-react'
import { EnvVarWarning } from '../env-var-warning'
import { SidebarMenuButton } from '../ui/sidebar'
import { useIsMobile } from '@/hooks/use-mobile'
import { Separator } from 'radix-ui'
import EditImageDialog from './edit-species-image'
import { Species } from '@/lib/react-query/queries'

export default function SpeciesDropdown({ species }: { species: Species }) {
	const isMobile = useIsMobile()

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<MoreVertical className='ml-auto size-4 group-data-[collapsible=icon]:hidden' />
			</DropdownMenuTrigger>
			<DropdownMenuContent
				side={isMobile ? 'bottom' : 'top'}
				align='end'
				sideOffset={4}
				className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
			>
				<DropdownMenuGroup>
					<DropdownMenuItem className='cursor-pointer'>View Information</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onSelect={(e) => {
							e.preventDefault()
						}}
						className='cursor-pointer'
					>
						<EditImageDialog species={species} />
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
