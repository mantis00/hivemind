import { useRef, useState } from 'react'
import { InputGroup, InputGroupAddon, InputGroupButton } from '../ui/input-group'
import TextareaAutosize from 'react-textarea-autosize'
import { useCreateEnclosureNote } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { LoaderCircle } from 'lucide-react'
import { UUID } from 'crypto'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { Checkbox } from '../ui/checkbox'
import { Label } from '../ui/label'

export default function CreateEnclosureNote({ enclosureId, is_active }: { enclosureId: UUID; is_active: boolean }) {
	const [noteText, setNoteText] = useState('')
	const [isFlagged, setIsFlagged] = useState(false)
	const createEnclosureNoteMutation = useCreateEnclosureNote()
	const { data: user } = useCurrentClientUser()
	const [loading, setLoading] = useState(false)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!is_active) return
		setLoading(true)

		createEnclosureNoteMutation.mutate(
			{ enclosureId, userId: user?.id as string, noteText, isFlagged },
			{
				onSuccess: () => {
					setNoteText('')
					setIsFlagged(false)
					setLoading(false)
				}
			}
		)
	}

	return (
		<>
			<form onSubmit={handleSubmit} className='grid w-full gap-6 pt-1 mx-auto focus'>
				<InputGroup>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className='w-full'>
									<TextareaAutosize
										ref={textareaRef}
										data-slot='input-group-control'
										className='flex field-sizing-content min-h-4 w-full resize-none rounded-md bg-transparent px-3 py-2.5 text-base transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-60 md:text-sm'
										placeholder={is_active ? 'New note...' : 'Enclosure is inactive.'}
										value={noteText}
										disabled={!is_active}
										onFocus={() =>
											setTimeout(
												() => textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
												300
											)
										}
										onChange={(e) => {
											setNoteText(e.target.value)
										}}
									/>
								</div>
							</TooltipTrigger>
							{!is_active ? (
								<TooltipContent>
									<p>You cannot add notes to an inactive enclosure.</p>
								</TooltipContent>
							) : null}
						</Tooltip>
					</TooltipProvider>
					<InputGroupAddon align='block-end'>
						{' '}
						<div className='flex items-center gap-2'>
							<Checkbox
								id='flag-note'
								checked={isFlagged}
								onCheckedChange={(checked) => setIsFlagged(checked === true)}
								disabled={!is_active}
							/>
							<Label htmlFor='flag-note' className='text-xs text-muted-foreground cursor-pointer'>
								Flag
							</Label>
						</div>{' '}
						<InputGroupButton
							className='ml-auto'
							size='sm'
							variant='default'
							type='submit'
							disabled={loading || !is_active}
						>
							{createEnclosureNoteMutation.isPending ? <LoaderCircle className='animate-spin' /> : 'Submit'}
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
			</form>
		</>
	)
}
