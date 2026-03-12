import { useRef, useState } from 'react'
import { InputGroup, InputGroupAddon, InputGroupButton } from '../ui/input-group'
import TextareaAutosize from 'react-textarea-autosize'
import { useCreateEnclosureNote } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { LoaderCircle } from 'lucide-react'
import { UUID } from 'crypto'

export default function CreateEnclosureNote({ enclosureId }: { enclosureId: UUID }) {
	const [noteText, setNoteText] = useState('')
	const createEnclosureNoteMutation = useCreateEnclosureNote()
	const { data: user } = useCurrentClientUser()
	const [loading, setLoading] = useState(false)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

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
						ref={textareaRef}
						data-slot='input-group-control'
						className='flex field-sizing-content min-h-4 w-full resize-none rounded-md bg-transparent px-3 py-2.5 text-base transition-[color,box-shadow] outline-none md:text-sm'
						placeholder='New note...'
						value={noteText}
						onFocus={() =>
							setTimeout(() => textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 300)
						}
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
