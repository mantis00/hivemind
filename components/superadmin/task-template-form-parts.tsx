'use client'

import { PlusIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { FieldRow, type FieldDef } from './template-fields'

// ─── TaskTypeSelector ─────────────────────────────────────────────────────────

interface TaskTypeSelectorProps {
	value: string
	onChange: (value: string) => void
	availableTypes: string[]
	showNewTypeInput: boolean
	onShowNewTypeInput: (show: boolean) => void
	/** Value to restore when the user clicks "Pick existing". Defaults to ''. */
	resetValue?: string
}

export function TaskTypeSelector({
	value,
	onChange,
	availableTypes,
	showNewTypeInput,
	onShowNewTypeInput,
	resetValue = ''
}: TaskTypeSelectorProps) {
	return (
		<div className='space-y-1'>
			<Label className='text-xs'>
				Task Type <span className='text-destructive'>*</span>
			</Label>
			{showNewTypeInput || availableTypes.length === 0 ? (
				<div className='flex gap-2'>
					<Input
						placeholder='e.g. feeding, cleaning, inspection'
						value={value}
						onChange={(e) => onChange(e.target.value)}
						autoFocus
						className='h-8 text-sm flex-1'
					/>
					{availableTypes.length > 0 && (
						<Button
							type='button'
							variant='outline'
							size='sm'
							className='shrink-0'
							onClick={() => {
								onShowNewTypeInput(false)
								onChange(resetValue)
							}}
						>
							Pick existing
						</Button>
					)}
				</div>
			) : (
				<Select
					value={value}
					onValueChange={(val) => {
						if (val === '__new__') {
							onShowNewTypeInput(true)
							onChange('')
						} else {
							onChange(val)
						}
					}}
				>
					<SelectTrigger className='h-8 text-sm'>
						<SelectValue placeholder='Select a type...' />
					</SelectTrigger>
					<SelectContent>
						{availableTypes.map((t) => (
							<SelectItem key={t} value={t}>
								{t}
							</SelectItem>
						))}
						<Separator className='my-1' />
						<SelectItem value='__new__'>+ Create new type…</SelectItem>
					</SelectContent>
				</Select>
			)}
		</div>
	)
}

// ─── DescriptionField ─────────────────────────────────────────────────────────

interface DescriptionFieldProps {
	value: string
	onChange: (value: string) => void
	placeholder?: string
}

export function DescriptionField({
	value,
	onChange,
	placeholder = 'Brief description of what this template is for…'
}: DescriptionFieldProps) {
	return (
		<div className='space-y-1'>
			<Label className='text-xs'>
				Description <span className='text-muted-foreground font-normal'>(optional)</span>
			</Label>
			<Textarea
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				rows={2}
				className='text-sm'
			/>
		</div>
	)
}

// ─── FieldsEditor ─────────────────────────────────────────────────────────────

interface FieldsEditorProps {
	fields: FieldDef[]
	onAdd: () => void
	onRemove: (id: string) => void
	onUpdate: (id: string, updates: Partial<FieldDef>) => void
	onAddChoice: (id: string) => void
	onRemoveChoice: (fieldId: string, choiceIndex: number) => void
}

export function FieldsEditor({ fields, onAdd, onRemove, onUpdate, onAddChoice, onRemoveChoice }: FieldsEditorProps) {
	return (
		<div className='space-y-2'>
			<div className='flex items-center justify-between'>
				<Label className='text-xs font-semibold'>Form Fields</Label>
				<Badge variant='secondary' className='text-xs'>
					{fields.length}
				</Badge>
			</div>
			<div className='space-y-2'>
				{fields.map((field, index) => (
					<FieldRow
						key={field._id}
						field={field}
						index={index}
						canDelete={fields.length > 1}
						onUpdate={(u) => onUpdate(field._id, u)}
						onDelete={() => onRemove(field._id)}
						onAddChoice={() => onAddChoice(field._id)}
						onRemoveChoice={(ci) => onRemoveChoice(field._id, ci)}
					/>
				))}
			</div>
			<Button type='button' variant='outline' size='sm' className='w-full' onClick={onAdd}>
				<PlusIcon className='h-3.5 w-3.5' />
				Add Field
			</Button>
		</div>
	)
}
