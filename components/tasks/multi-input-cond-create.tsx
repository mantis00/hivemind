import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

export function MultiCondInput({ value = [], onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
	const [inputValue, setInputValue] = useState('')

	const addTag = () => {
		const trimmed = inputValue.trim()
		if (trimmed && !value.includes(trimmed)) {
			onChange([...value, trimmed])
			setInputValue('')
		}
	}

	const removeTag = (tagToRemove: string) => {
		onChange(value.filter((tag) => tag !== tagToRemove))
	}

	return (
		<div className='space-y-3'>
			<div className='flex gap-2'>
				<Input
					placeholder='Type condition(s)'
					value={inputValue}
					onChange={(e) => setInputValue(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ',') {
							e.preventDefault()
							addTag()
						}
					}}
				/>
			</div>

			<div className='flex flex-wrap gap-2 min-h-[32px]'>
				{value.map((tag) => (
					<Badge key={tag} variant='secondary' className='pl-2 pr-1 py-1 gap-1'>
						{tag}
						<button
							type='button'
							onClick={() => removeTag(tag)}
							className='rounded-full outline-none hover:bg-muted p-0.5'
						>
							<X size={14} />
						</button>
					</Badge>
				))}
			</div>
		</div>
	)
}
