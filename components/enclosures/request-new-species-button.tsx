import { useEffect, useState } from 'react'
import { ResponsiveDialogDrawer } from '../ui/dialog-to-drawer'
import { Button } from '../ui/button'
import { Icon, LoaderCircle, Send } from 'lucide-react'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { useRequestSpecies } from '@/lib/react-query/mutations'
import { UUID } from 'crypto'
import { useParams } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export default function RequestNewSpeciesButton() {
	const [open, setOpen] = useState(false)
	const [commonName, setCommonName] = useState('')
	const [scientificName, setScientificName] = useState('')
	const [careInstructions, setCareInstructions] = useState('')

	const requestSpecies = useRequestSpecies()

	const params = useParams()
	const orgId = params?.orgId as UUID | undefined

	const [user, setUser] = useState<User | null>(null)
	const supabase = createClient()

	useEffect(() => {
		const fetchUser = async () => {
			const {
				data: { user }
			} = await supabase.auth.getUser()
			setUser(user)
		}

		fetchUser()
	}, [])

	const resetForm = () => {
		setScientificName('')
		setCommonName('')
		setCareInstructions('')
	}

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) resetForm()
		setOpen(isOpen)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		requestSpecies.mutate(
			{
				scientific_name: scientificName,
				common_name: commonName,
				care_instructions: careInstructions,
				org_id: orgId as UUID,
				user_id: user?.id as UUID
			},
			{ onSuccess: () => handleOpenChange(false) }
		)
	}

	const isPending = requestSpecies.isPending

	return (
		<ResponsiveDialogDrawer
			title='Request New Species'
			description='Provide some information about your species'
			open={open}
			onOpenChange={(isOpen) => setOpen(isOpen)}
			trigger={
				<Button variant='secondary' size='default' onClick={() => setOpen(true)}>
					Request New <Send className='w-4 h-4' />
				</Button>
			}
		>
			<form onSubmit={handleSubmit} className='flex flex-col gap-4 overflow-y-auto max-h-[70vh] px-1'>
				<div className='grid gap-3'>
					<div className='flex flex-col gap-1.5'>
						<Label htmlFor='create_common_name'>Common Name</Label>
						<Input
							id='create_common_name'
							value={commonName}
							onChange={(e) => setCommonName(e.target.value)}
							disabled={isPending}
							required
							placeholder='e.g. Tarantula'
						/>
					</div>
					<div className='flex flex-col gap-1.5'>
						<Label htmlFor='create_scientific_name'>Scientific Name</Label>
						<Input
							id='create_scientific_name'
							value={scientificName}
							onChange={(e) => setScientificName(e.target.value)}
							disabled={isPending}
							required
							placeholder='e.g. Theraphosa blondi'
						/>
					</div>
					<div className='flex flex-col gap-1.5'>
						<Label htmlFor='create_care'>Care Instructions</Label>
						<Textarea
							id='create_care'
							value={careInstructions}
							onChange={(e) => setCareInstructions(e.target.value)}
							disabled={isPending}
							rows={4}
							placeholder='Enter care instructions…'
						/>
					</div>
				</div>

				<div className='flex gap-2 justify-end'>
					<Button type='button' variant='outline' onClick={() => handleOpenChange(false)} disabled={isPending}>
						Cancel
					</Button>
					<Button type='submit' disabled={isPending}>
						{isPending ? <LoaderCircle className='h-4 w-4 animate-spin' /> : 'Send Request'}
					</Button>
				</div>
			</form>
		</ResponsiveDialogDrawer>
	)
}
