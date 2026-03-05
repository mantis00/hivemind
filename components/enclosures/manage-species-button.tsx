import { useState } from 'react'
import { ResponsiveDialogDrawer } from '../ui/dialog-to-drawer'
import { Button } from '../ui/button'
import { Move } from 'lucide-react'
import SpeciesTransferList from './species-transfer'

export default function ManageSpeciesButton() {
	const [open, setOpen] = useState(false)

	return (
		<ResponsiveDialogDrawer
			title='Manage Species'
			description='Select species to include or remove from your organization '
			open={open}
			onOpenChange={(isOpen) => setOpen(isOpen)}
			trigger={
				<Button variant='secondary' size='default' onClick={() => setOpen(true)}>
					Manage Species
					<Move className='w-4 h-4' />
				</Button>
			}
		>
			<SpeciesTransferList />
			<Button
				size='default'
				onClick={() => {
					setOpen(false)
				}}
			>
				Cancel
			</Button>
		</ResponsiveDialogDrawer>
	)
}
