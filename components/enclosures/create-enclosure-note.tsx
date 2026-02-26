import { useEffect, useState } from 'react'
import { InputGroup, InputGroupAddon, InputGroupButton } from '../ui/input-group'
import TextareaAutosize from 'react-textarea-autosize'
import { useCreateEnclosureNote } from '@/lib/react-query/mutations'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { LoaderCircle } from 'lucide-react'
import { UUID } from 'crypto'

export default function CreateEnclosureNote({ enclosureId }: { enclosureId: UUID }) {
	const [noteText, setNoteText] = useState('')
	const createEnclosureNoteMutation = useCreateEnclosureNote()
	const [user, setUser] = useState<User | null>(null)
	const supabase = createClient()
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		const fetchUser = async () => {
			const {
				data: { user }
			} = await supabase.auth.getUser()
			setUser(user)
			setLoading(false)
		}

		fetchUser()
	}, [])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)

		createEnclosureNoteMutation.mutate(
			{ enclosureId, userId: user?.id as string, noteText },
			{
				onSuccess: () => {
					setNoteText('')
					setLoading(false)
				}
			}
		)
	}

	return (
		<>
			<form onSubmit={handleSubmit} className='grid w-full gap-6 pt-1 mx-auto focus'>
				<InputGroup>
					<TextareaAutosize
						data-slot='input-group-control'
						className='flex field-sizing-content min-h-16 w-full resize-none rounded-md bg-transparent px-3 py-2.5 text-base transition-[color,box-shadow] outline-none md:text-sm'
						placeholder='New note...'
						value={noteText}
						onChange={(e) => {
							setNoteText(e.target.value)
						}}
					/>
					<InputGroupAddon align='block-end'>
						<InputGroupButton className='ml-auto' size='sm' variant='default' type='submit' disabled={loading}>
							{createEnclosureNoteMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Submit'}
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
			</form>
		</>
	)
}
