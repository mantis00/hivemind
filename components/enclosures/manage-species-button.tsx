import { useState } from 'react'
import { ResponsiveDialogDrawer } from '../ui/dialog-to-drawer'
import { Button } from '../ui/button'
import { Move } from 'lucide-react'
import SpeciesTransferList from './species-transfer'

export default function ManageSpeciesButton({
	open: propsOpen,
	onOpenChange: propsOnOpenChange
}: {
	open?: boolean
	onOpenChange?: (open: boolean) => void
} = {}) {
	const controlled = propsOpen !== undefined
	const [localOpen, setLocalOpen] = useState(false)
	const open = controlled ? propsOpen! : localOpen
	const setOpen = controlled ? (val: boolean) => propsOnOpenChange?.(val) : setLocalOpen

	return (
		<ResponsiveDialogDrawer
			title='Manage Species'
			description='Select species to include or remove from your organization '
			open={open}
			onOpenChange={(isOpen) => setOpen(isOpen)}
			className='sm:max-w-2xl'
			trigger={
				controlled ? null : (
					<Button variant='secondary' size='default' onClick={() => setOpen(true)}>
						Manage Species
						<Move className='w-4 h-4' />
					</Button>
				)
			}
		>
			<SpeciesTransferList onClose={() => setOpen(false)} />
		</ResponsiveDialogDrawer>
	)
}
